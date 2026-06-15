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

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeesRepository: Repository<Employee>,
  ) {}

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    await this.ensureUniqueFields(dto.employeeCode, dto.email);

    const employee = this.employeesRepository.create({
      ...dto,
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

    if (dto.employeeCode && dto.employeeCode !== employee.employeeCode) {
      const existing = await this.employeesRepository.findOne({
        where: { employeeCode: dto.employeeCode },
      });
      if (existing) {
        throw new ConflictException('Employee code already exists');
      }
    }

    if (dto.email && dto.email !== employee.email) {
      const existing = await this.employeesRepository.findOne({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('Email already exists');
      }
    }

    const hasChanges =
      (dto.employeeCode !== undefined && dto.employeeCode !== employee.employeeCode) ||
      (dto.firstName !== undefined && dto.firstName !== employee.firstName) ||
      (dto.lastName !== undefined && dto.lastName !== employee.lastName) ||
      (dto.email !== undefined && dto.email !== employee.email) ||
      (dto.phone !== undefined && !isSameOptionalString(dto.phone, employee.phone)) ||
      (dto.department !== undefined && dto.department !== employee.department) ||
      (dto.designation !== undefined && dto.designation !== employee.designation) ||
      (dto.basicSalary !== undefined && Number(dto.basicSalary) !== Number(employee.basicSalary)) ||
      (dto.joinDate !== undefined && dto.joinDate !== employee.joinDate) ||
      (dto.status !== undefined && dto.status !== employee.status);

    if (!hasChanges) {
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
      order: { firstName: 'ASC' },
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

  private async ensureUniqueFields(
    employeeCode: string,
    email: string,
  ): Promise<void> {
    const existingCode = await this.employeesRepository.findOne({
      where: { employeeCode },
    });
    if (existingCode) {
      throw new ConflictException('Employee code already exists');
    }

    const existingEmail = await this.employeesRepository.findOne({
      where: { email },
    });
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }
  }
}
