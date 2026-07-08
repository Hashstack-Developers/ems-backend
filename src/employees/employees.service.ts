import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NoChangesException } from '../common/exceptions/no-changes.exception';
import { isSameOptionalString } from '../common/utils/change-detection';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { buildEmployeeCodeFromCnic } from './employee.utils';
import { Employee, EmployeeStatus } from './entities/employee.entity';

const NUMERIC_FIELDS = [
  'basicPayDec2025',
  'basicPayJul2026',
  'personalAllowance',
  'hr',
  'ca',
  'ma',
  'adHocAllowance2022',
  'adHocAllowance2023',
  'adHocAllowance2024',
  'adHocAllowance2025',
  'adHocAllowance2026',
  'personalPay',
  'overtimeAllowance',
  'integratedAllowance',
  'wa',
  'computerAllowance',
  'specialAllowance',
  'specialPay',
  'mphilSpecialAllowance',
  'socialSecurityBenefit',
  'grossSalary',
  'loanAdvance',
  'deduction',
  'arrears',
  'previousDeduction',
  'totalDeductedIncomeTax202526',
  'annualIncomeTax202526',
  'grossSalaryWithTaxes',
  'incomeTaxMay2026',
  'gpFund',
  'previouslyCollectedGpFund',
  'gpfCollection',
  'netPayable',
  'increment',
] as const;

const OPTIONAL_STRING_FIELDS = [
  'srNo',
  'fatherName',
  'address',
  'basicPayScale',
  'religion',
  'disability',
  'salaryTill',
  'contractExpiryDate',
  'dateOfRegularization',
  'dateOfBirth',
  'dateOfRetirement',
  'lengthOfService',
  'mobile',
  'cnicNo',
  'stage',
  'timePeriod',
  'accountNumber',
  'nomineeName',
  'nomineeRelation',
  'gpfAccountNumber',
] as const;

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeesRepository: Repository<Employee>,
    private readonly configService: ConfigService,
    private readonly moduleRef: ModuleRef,
  ) {}

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    console.log('[EMPLOYEE_CREATE] Starting employee creation with DTO:', {
      name: dto.name,
      email: dto.email,
      cnicNo: dto.cnicNo,
      dateOfJoining: dto.dateOfJoining,
    });

    try {
      console.log('[EMPLOYEE_CREATE] Checking email uniqueness for:', dto.email);
      await this.ensureUniqueEmail(dto.email);
      console.log('[EMPLOYEE_CREATE] Email is unique');

      console.log('[EMPLOYEE_CREATE] Normalizing DTO');
      const normalized = this.normalizeDto(dto);
      console.log('[EMPLOYEE_CREATE] DTO normalized:', {
        name: normalized.name,
        cnicNo: normalized.cnicNo,
      });

      console.log('[EMPLOYEE_CREATE] Generating employee code from CNIC:', normalized.cnicNo);
      const employeeCode = await this.generateEmployeeCode(normalized.cnicNo);
      console.log('[EMPLOYEE_CREATE] Employee code generated:', employeeCode);

      console.log('[EMPLOYEE_CREATE] Generating Sr No');
      const srNo = normalized.srNo ?? (await this.generateSrNo());
      console.log('[EMPLOYEE_CREATE] Sr No generated:', srNo);

      console.log('[EMPLOYEE_CREATE] Creating employee entity in memory');
      const employee = this.employeesRepository.create({
        ...normalized,
        employeeCode,
        srNo,
        status: normalized.status ?? EmployeeStatus.ACTIVE,
      });
      console.log('[EMPLOYEE_CREATE] Employee entity created');

      console.log('[EMPLOYEE_CREATE] Saving employee to database');
      const savedEmployee = await this.employeesRepository.save(employee);
      console.log('[EMPLOYEE_CREATE] Employee saved successfully with ID:', savedEmployee.id);

      console.log('[EMPLOYEE_CREATE] Checking AUTO_GENERATE_PAYROLLS config');
      const autoGeneratePayrolls = this.configService.get<boolean>('AUTO_GENERATE_PAYROLLS', false);
      console.log('[EMPLOYEE_CREATE] AUTO_GENERATE_PAYROLLS:', autoGeneratePayrolls);
      console.log('[EMPLOYEE_CREATE] dateOfJoining:', savedEmployee.dateOfJoining);

      if (autoGeneratePayrolls && savedEmployee.dateOfJoining) {
        console.log('[EMPLOYEE_CREATE] Scheduling payroll generation for employee:', savedEmployee.id);
        setImmediate(() => {
          console.log('[PAYROLL_GEN] Starting background payroll generation for employee:', savedEmployee.id);
          this.generatePayrollsForEmployee(savedEmployee).catch((err) => {
            console.error('[PAYROLL_GEN] Error in background generation:', {
              employeeId: savedEmployee.id,
              error: err.message,
              stack: err.stack,
            });
          });
        });
      } else {
        console.log('[EMPLOYEE_CREATE] Skipping payroll generation:', {
          autoGeneratePayrolls,
          hasDateOfJoining: !!savedEmployee.dateOfJoining,
        });
      }

      console.log('[EMPLOYEE_CREATE] Returning created employee with ID:', savedEmployee.id);
      return savedEmployee;
    } catch (error) {
      console.error('[EMPLOYEE_CREATE] Error during employee creation:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async findAll(): Promise<Employee[]> {
    return this.employeesRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<Employee> {
    const employee = await this.employeesRepository.findOne({ where: { id } });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }
    return employee;
  }

  async update(id: number, dto: UpdateEmployeeDto): Promise<Employee> {
    const employee = await this.findOne(id);

    if (dto.email && dto.email !== employee.email) {
      await this.ensureUniqueEmail(dto.email, id);
    }

    if (!this.hasChanges(employee, dto)) {
      throw new NoChangesException();
    }

    const dateOfJoiningChanged =
      dto.dateOfJoining !== undefined && dto.dateOfJoining !== employee.dateOfJoining;

    const normalized = this.normalizeDto(dto);
    Object.assign(employee, normalized);
    const savedEmployee = await this.employeesRepository.save(employee);

    if (dateOfJoiningChanged) {
      const autoGeneratePayrolls = this.configService.get<boolean>('AUTO_GENERATE_PAYROLLS', false);
      if (autoGeneratePayrolls && savedEmployee.dateOfJoining) {
        setImmediate(() => {
          this.generatePayrollsForEmployee(savedEmployee).catch((err) => {
            console.error('[PAYROLL_GEN] Error in background generation after update:', {
              employeeId: savedEmployee.id,
              error: err.message,
              stack: err.stack,
            });
          });
        });
      }
    }

    return savedEmployee;
  }

  async remove(id: number): Promise<void> {
    const employee = await this.findOne(id);
    await this.employeesRepository.remove(employee);
  }

  async findActiveEmployees(): Promise<Employee[]> {
    return this.employeesRepository.find({
      where: { status: EmployeeStatus.ACTIVE },
      order: { name: 'ASC' },
    });
  }

  async count(): Promise<number> {
    return this.employeesRepository.count();
  }

  async countActive(): Promise<number> {
    return this.employeesRepository.count({
      where: { status: EmployeeStatus.ACTIVE },
    });
  }

  async findActiveEmployeesWithHoldStatus(): Promise<
    Pick<Employee, 'id' | 'employeeCode' | 'name' | 'designation' | 'payrollOnHold' | 'payrollHeldFrom'>[]
  > {
    return this.employeesRepository.find({
      where: { status: EmployeeStatus.ACTIVE },
      select: { id: true, employeeCode: true, name: true, designation: true, payrollOnHold: true, payrollHeldFrom: true },
      order: { name: 'ASC' },
    });
  }

  async setPayrollHold(id: number, onHold: boolean): Promise<void> {
    const employee = await this.findOne(id);
    if (onHold) {
      const now = new Date();
      const heldFrom = employee.payrollHeldFrom ?? new Date(now.getFullYear(), now.getMonth(), 1);
      await this.employeesRepository.update(id, {
        payrollOnHold: true,
        payrollHeldFrom: heldFrom,
      });
    } else {
      await this.employeesRepository.update(id, { payrollOnHold: false });
    }
  }

  async clearPayrollHeldFrom(id: number): Promise<void> {
    await this.employeesRepository.update(id, { payrollHeldFrom: null });
  }

  private async generatePayrollsForEmployee(employee: Employee): Promise<void> {
    console.log('[PAYROLL_GEN] Starting generatePayrollsForEmployee for employee:', {
      id: employee.id,
      code: employee.employeeCode,
      dateOfJoining: employee.dateOfJoining,
    });

    if (!employee.dateOfJoining) {
      console.log('[PAYROLL_GEN] No dateOfJoining, returning');
      return;
    }

    try {
      console.log('[PAYROLL_GEN] Getting PayrollsService from ModuleRef');
      const payrollsService = this.moduleRef.get('PayrollsService', { strict: false });
      console.log('[PAYROLL_GEN] PayrollsService available:', !!payrollsService);

      if (!payrollsService) {
        console.warn('[PAYROLL_GEN] PayrollsService not available for auto-generation');
        return;
      }

      const joinDate = new Date(employee.dateOfJoining);
      const now = new Date();

      const startYear = joinDate.getFullYear();
      const startMonth = joinDate.getMonth() + 1;
      const endYear = now.getFullYear();
      const endMonth = now.getMonth() + 1;

      console.log('[PAYROLL_GEN] Date range:', {
        startYear,
        startMonth,
        endYear,
        endMonth,
      });

      const monthsToGenerate: Array<{ month: number; year: number }> = [];
      for (let year = startYear; year <= endYear; year++) {
        const monthStart = year === startYear ? startMonth : 1;
        const monthEnd = year === endYear ? endMonth : 12;

        for (let month = monthStart; month <= monthEnd; month++) {
          monthsToGenerate.push({ month, year });
        }
      }

      console.log(`[PAYROLL_GEN] Starting auto-payroll generation for employee ${employee.employeeCode} (${monthsToGenerate.length} months)`);

      let generated = 0;
      let skipped = 0;
      let failed = 0;

      for (const { month, year } of monthsToGenerate) {
        try {
          console.log('[PAYROLL_GEN] Generating payroll for:', {
            employeeCode: employee.employeeCode,
            month,
            year,
          });

          const result = await payrollsService.generate({
            employeeId: employee.id,
            month,
            year,
          });

          console.log('[PAYROLL_GEN] Payroll generation result:', {
            created: result.created.length,
            skipped: result.skipped.length,
            errors: result.errors.length,
          });

          if (result.created.length > 0) {
            generated++;
          } else if (result.skipped.length > 0) {
            skipped++;
          }

          await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (error) {
          failed++;
          console.error('[PAYROLL_GEN] Failed to generate payroll', {
            employeeCode: employee.employeeCode,
            month,
            year,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          });
        }
      }

      console.log(`[PAYROLL_GEN] Auto-payroll generation completed for ${employee.employeeCode}: ${generated} created, ${skipped} skipped, ${failed} failed`);
    } catch (error) {
      console.error('[PAYROLL_GEN] Error during auto-payroll generation', {
        employeeCode: employee.employeeCode,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  private normalizeDto<T extends CreateEmployeeDto | UpdateEmployeeDto>(dto: T): T {
    const normalized = { ...dto } as T & { mobile?: string; cnicNo?: string };

    if (normalized.mobile) {
      normalized.mobile = normalized.mobile.replace(/[\s-]/g, '');
    }

    if (normalized.cnicNo) {
      const digits = normalized.cnicNo.replace(/\D/g, '');
      if (digits.length === 13) {
        normalized.cnicNo = `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
      }
    }

    return normalized as T;
  }

  private async generateEmployeeCode(cnicNo?: string): Promise<string> {
    console.log('[EMPLOYEE_CODE_GEN] Generating code from CNIC:', cnicNo);
    const employeeCode = buildEmployeeCodeFromCnic(cnicNo);
    console.log('[EMPLOYEE_CODE_GEN] Generated code:', employeeCode);

    if (!employeeCode) {
      console.error('[EMPLOYEE_CODE_GEN] Failed to generate code from CNIC:', cnicNo);
      throw new BadRequestException(
        'Valid CNIC is required to generate employee code (format: XXXXX-XXXXXXX-X)',
      );
    }

    console.log('[EMPLOYEE_CODE_GEN] Checking if code already exists:', employeeCode);
    const existing = await this.employeesRepository.findOne({
      where: { employeeCode },
    });
    if (existing) {
      console.error('[EMPLOYEE_CODE_GEN] Code already exists:', employeeCode);
      throw new ConflictException(
        `Employee with code ${employeeCode} already exists`,
      );
    }

    console.log('[EMPLOYEE_CODE_GEN] Code is unique:', employeeCode);
    return employeeCode;
  }

  private async generateSrNo(): Promise<string> {
    const result = await this.employeesRepository
      .createQueryBuilder('e')
      .select('MAX(CAST(e.sr_no AS UNSIGNED))', 'maxSr')
      .where('e.sr_no REGEXP :pattern', { pattern: '^[0-9]+$' })
      .getRawOne<{ maxSr: string | null }>();

    const next = (result?.maxSr ? parseInt(result.maxSr, 10) : 0) + 1;
    return String(next);
  }

  private hasChanges(employee: Employee, dto: UpdateEmployeeDto): boolean {
    for (const [key, value] of Object.entries(dto)) {
      if (value === undefined) continue;

      const current = employee[key as keyof Employee];

      if ((NUMERIC_FIELDS as readonly string[]).includes(key)) {
        if (Number(value) !== Number(current ?? 0)) return true;
        continue;
      }

      if ((OPTIONAL_STRING_FIELDS as readonly string[]).includes(key)) {
        if (!isSameOptionalString(value as string, current as string | null)) {
          return true;
        }
        continue;
      }

      if (value !== current) return true;
    }

    return false;
  }

  private async ensureUniqueEmail(
    email: string,
    excludeId?: number,
  ): Promise<void> {
    console.log('[EMAIL_CHECK] Checking email uniqueness:', {
      email,
      excludeId,
    });
    const existing = await this.employeesRepository.findOne({
      where: { email },
    });
    console.log('[EMAIL_CHECK] Existing email found:', !!existing);
    if (existing && existing.id !== excludeId) {
      console.error('[EMAIL_CHECK] Email already exists:', email);
      throw new ConflictException('Email already exists');
    }
    console.log('[EMAIL_CHECK] Email is unique:', email);
  }
}
