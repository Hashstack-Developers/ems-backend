import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PensionEnrollment } from './entities/pension-enrollment.entity';
import { PensionSettingsService } from './pension-settings.service';
import { Payroll } from '../payrolls/entities/payroll.entity';
import { PayrollDeduction, DeductionCategory, DeductionCalculationType } from '../payrolls/entities/payroll-deduction.entity';
import { Employee, EmployeeType } from '../employees/entities/employee.entity';
import { roundAmount } from '../common/utils/currency.utils';
import { PENSION_DEDUCTION_CODE } from './pension.utils';

@Injectable()
export class PensionEnrollmentService {
  constructor(
    @InjectRepository(PensionEnrollment)
    private readonly enrollmentRepo: Repository<PensionEnrollment>,
    @InjectRepository(Payroll)
    private readonly payrollRepo: Repository<Payroll>,
    @InjectRepository(PayrollDeduction)
    private readonly deductionRepo: Repository<PayrollDeduction>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly settingsService: PensionSettingsService,
  ) {}

  async findAll(): Promise<PensionEnrollment[]> {
    return this.enrollmentRepo.find({
      relations: { employee: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findByEmployee(employeeId: number): Promise<PensionEnrollment | null> {
    return this.enrollmentRepo.findOne({
      where: { employeeId },
      relations: { employee: true },
    });
  }

  async getActiveEnrollment(employeeId: number): Promise<PensionEnrollment | null> {
    return this.enrollmentRepo.findOne({
      where: { employeeId, isActive: true },
    });
  }

  async enroll(dto: { employeeId: number; enrolledAt: string }): Promise<PensionEnrollment> {
    const employee = await this.employeeRepo.findOne({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException(`Employee ${dto.employeeId} not found`);

    const existing = await this.enrollmentRepo.findOne({ where: { employeeId: dto.employeeId } });
    if (existing) {
      if (existing.isActive) throw new BadRequestException('Employee already has an active pension enrollment');
      // Reactivate
      existing.isActive = true;
      existing.enrolledAt = dto.enrolledAt;
      await this.enrollmentRepo.save(existing);
      await this.backfillFromEnrollmentDate(employee, dto.enrolledAt);
      return this.findByEmployee(dto.employeeId) as Promise<PensionEnrollment>;
    }

    const enrollment = this.enrollmentRepo.create({
      employeeId: dto.employeeId,
      enrolledAt: dto.enrolledAt,
      isActive: true,
    });
    await this.enrollmentRepo.save(enrollment);
    await this.backfillFromEnrollmentDate(employee, dto.enrolledAt);

    return this.findByEmployee(dto.employeeId) as Promise<PensionEnrollment>;
  }

  async deactivate(employeeId: number): Promise<PensionEnrollment> {
    const enrollment = await this.enrollmentRepo.findOne({ where: { employeeId, isActive: true } });
    if (!enrollment) throw new NotFoundException('No active pension enrollment found for this employee');
    enrollment.isActive = false;
    return this.enrollmentRepo.save(enrollment);
  }

  async remove(employeeId: number): Promise<void> {
    const enrollment = await this.enrollmentRepo.findOne({ where: { employeeId } });
    if (!enrollment) throw new NotFoundException('No pension enrollment found for this employee');
    await this.enrollmentRepo.remove(enrollment);
  }

  private async backfillFromEnrollmentDate(employee: Employee, enrolledAt: string): Promise<void> {
    const settings = await this.settingsService.getSettings();
    const rate = employee.employeeType === EmployeeType.EMPLOYER
      ? Number(settings.employerRate)
      : Number(settings.employeeRate);

    const basicPay = Number(employee.basicPayDec2025 ?? 0);
    if (basicPay <= 0 || rate <= 0) return;

    const pensionAmount = this.settingsService.computePensionAmount(basicPay, rate);
    if (pensionAmount <= 0) return;

    const enrollDate = new Date(enrolledAt);
    const enrollYear = enrollDate.getFullYear();
    const enrollMonth = enrollDate.getMonth() + 1;

    const payrolls = await this.payrollRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.deductions', 'd')
      .where('p.employee_id = :employeeId', { employeeId: employee.id })
      .andWhere('(p.year > :ey OR (p.year = :ey AND p.month >= :em))', {
        ey: enrollYear,
        em: enrollMonth,
      })
      .orderBy('p.year', 'ASC')
      .addOrderBy('p.month', 'ASC')
      .getMany();

    for (const payroll of payrolls) {
      const alreadyHasPension = payroll.deductions?.some((d) => d.code === PENSION_DEDUCTION_CODE);
      if (alreadyHasPension) continue;

      // Add pension deduction
      await this.deductionRepo.save({
        payrollId: payroll.id,
        name: 'Pension Contribution',
        code: PENSION_DEDUCTION_CODE,
        category: DeductionCategory.PENSION,
        amount: pensionAmount,
        calculationType: DeductionCalculationType.PERCENTAGE,
        appliedRate: rate,
        appliedFixedAmount: null,
        sourceSubTaxId: null,
      });

      // Update payroll totals
      await this.payrollRepo.update(payroll.id, {
        pensionAmount: roundAmount(Number(payroll.pensionAmount ?? 0) + pensionAmount),
        totalDeductions: roundAmount(Number(payroll.totalDeductions) + pensionAmount),
        netSalary: roundAmount(Number(payroll.netSalary) - pensionAmount),
      });
    }
  }
}
