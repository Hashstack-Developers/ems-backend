import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
] as const;

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeesRepository: Repository<Employee>,
  ) {}

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    await this.ensureUniqueEmail(dto.email);

    const normalized = this.normalizeDto(dto);
    const employeeCode = await this.generateEmployeeCode(normalized.cnicNo);
    const srNo = normalized.srNo ?? (await this.generateSrNo());
    const employee = this.employeesRepository.create({
      ...normalized,
      employeeCode,
      srNo,
      status: normalized.status ?? EmployeeStatus.ACTIVE,
    });
    return this.employeesRepository.save(employee);
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

    const normalized = this.normalizeDto(dto);
    Object.assign(employee, normalized);
    return this.employeesRepository.save(employee);
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
    const employeeCode = buildEmployeeCodeFromCnic(cnicNo);
    if (!employeeCode) {
      throw new BadRequestException(
        'Valid CNIC is required to generate employee code (format: XXXXX-XXXXXXX-X)',
      );
    }

    const existing = await this.employeesRepository.findOne({
      where: { employeeCode },
    });
    if (existing) {
      throw new ConflictException(
        `Employee with code ${employeeCode} already exists`,
      );
    }

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
    const existing = await this.employeesRepository.findOne({
      where: { email },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('Email already exists');
    }
  }
}
