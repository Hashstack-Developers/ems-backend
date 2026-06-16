import {
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
import { Employee, EmployeeStatus } from './entities/employee.entity';

const NUMERIC_FIELDS = [
  'basicPayDec2025',
  'personalAllowance',
  'hr',
  'ca',
  'ma',
  'adHocAllowance2022',
  'adHocAllowance2023',
  'adHocAllowance2024',
  'adHocAllowance2025',
  'overtimeAllowance',
  'integratedAllowance',
  'wa',
  'specialAllowance',
  'specialPay',
  'mphilSpecialAllowance',
  'socialSecurityBenefit',
  'grossSalary',
  'deduction',
  'arrears',
  'grossSalaryWithTaxes',
  'incomeTaxMay2026',
  'gpFund',
  'netPayable',
] as const;

const OPTIONAL_STRING_FIELDS = [
  'basicPayScale',
  'religion',
  'salaryTill',
  'contractExpiryDate',
  'dateOfRegularization',
  'dateOfBirth',
  'dateOfRetirement',
  'lengthOfService',
  'mobile',
  'cnicNo',
  'stage',
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

    const employeeCode = await this.generateEmployeeCode();
    const employee = this.employeesRepository.create({
      ...dto,
      employeeCode,
      status: dto.status ?? EmployeeStatus.ACTIVE,
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

    Object.assign(employee, dto);
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

  private async generateEmployeeCode(): Promise<string> {
    const result = await this.employeesRepository
      .createQueryBuilder('e')
      .select('MAX(e.id)', 'maxId')
      .getRawOne<{ maxId: string | null }>();

    const nextId = (result?.maxId ? parseInt(result.maxId, 10) : 0) + 1;
    return `EMP-${String(nextId).padStart(4, '0')}`;
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
