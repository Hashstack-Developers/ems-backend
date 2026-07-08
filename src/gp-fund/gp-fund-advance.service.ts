import { roundAmount } from '../common/utils/currency.utils';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { Payroll } from '../payrolls/entities/payroll.entity';
import {
  DeductionCalculationType,
  DeductionCategory,
  PayrollDeduction,
} from '../payrolls/entities/payroll-deduction.entity';
import { CreateGpFundAdvanceDto } from './dto/create-gp-fund-advance.dto';
import { GpFundAdvanceQueryDto } from './dto/gp-fund-advance-query.dto';
import { GpFundAdvancePayment } from './entities/gp-fund-advance-payment.entity';
import {
  GpFundAdvance,
  GpFundAdvanceStatus,
} from './entities/gp-fund-advance.entity';
import {
  calculateAdvanceInstallmentAmount,
  calculateAdvanceMonthlyInstallment,
  getAdvanceRemainingBalance,
  GP_FUND_ADVANCE_CODE,
  GP_FUND_ADVANCE_MAX_PERCENTAGE_OF_BALANCE,
} from './gp-fund.utils';
import { GpFundService } from './gp-fund.service';

export interface GpFundAdvanceInstallmentResult {
  advanceId: number;
  amount: number;
  monthlyInstallment: number;
  installmentMonths: number;
  remainingBefore: number;
  remainingAfter: number;
  installmentNumber: number;
}

@Injectable()
export class GpFundAdvanceService {
  constructor(
    @InjectRepository(GpFundAdvance)
    private readonly advanceRepository: Repository<GpFundAdvance>,
    @InjectRepository(GpFundAdvancePayment)
    private readonly paymentRepository: Repository<GpFundAdvancePayment>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Payroll)
    private readonly payrollsRepository: Repository<Payroll>,
    @InjectRepository(PayrollDeduction)
    private readonly payrollDeductionRepository: Repository<PayrollDeduction>,
    private readonly gpFundService: GpFundService,
  ) {}

  async findAll(query: GpFundAdvanceQueryDto = {}): Promise<GpFundAdvance[]> {
    const qb = this.advanceRepository
      .createQueryBuilder('advance')
      .leftJoinAndSelect('advance.employee', 'employee')
      .leftJoinAndSelect('advance.payments', 'payments')
      .orderBy('advance.createdAt', 'DESC');

    if (query.employeeId) {
      qb.andWhere('advance.employee_id = :employeeId', { employeeId: query.employeeId });
    }
    if (query.status) {
      qb.andWhere('advance.status = :status', { status: query.status });
    }

    return qb.getMany();
  }

  async findOne(id: number): Promise<GpFundAdvance> {
    const advance = await this.advanceRepository.findOne({
      where: { id },
      relations: { employee: true, payments: true },
    });
    if (!advance) {
      throw new NotFoundException(`GP Fund advance with ID ${id} not found`);
    }
    return advance;
  }

  async findActiveForEmployee(employeeId: number): Promise<GpFundAdvance | null> {
    return this.advanceRepository.findOne({
      where: { employeeId, status: GpFundAdvanceStatus.ACTIVE },
      relations: { employee: true, payments: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getAdvanceEligibility(employeeId: number): Promise<{
    totalGpFundBalance: number;
    maxAdvancePercentage: number;
    maxAdvanceAmount: number;
  }> {
    const totalGpFundBalance = await this.gpFundService.getCurrentTotalGpFundBalance(employeeId);
    const maxAdvanceAmount = roundAmount(
      (totalGpFundBalance * GP_FUND_ADVANCE_MAX_PERCENTAGE_OF_BALANCE) / 100,
    );

    return {
      totalGpFundBalance,
      maxAdvancePercentage: GP_FUND_ADVANCE_MAX_PERCENTAGE_OF_BALANCE,
      maxAdvanceAmount,
    };
  }

  async create(dto: CreateGpFundAdvanceDto): Promise<GpFundAdvance> {
    const employee = await this.employeeRepository.findOne({
      where: { id: dto.employeeId },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${dto.employeeId} not found`);
    }

    const existingActive = await this.findActiveForEmployee(dto.employeeId);
    if (existingActive) {
      throw new BadRequestException(
        `${employee.name} already has an active GP Fund advance. Complete or cancel it before assigning a new one.`,
      );
    }

    const { totalGpFundBalance, maxAdvanceAmount } = await this.getAdvanceEligibility(
      dto.employeeId,
    );
    if (dto.advanceAmount > maxAdvanceAmount) {
      throw new BadRequestException(
        `Advance amount cannot exceed ${GP_FUND_ADVANCE_MAX_PERCENTAGE_OF_BALANCE}% of ${employee.name}'s total GP fund balance (Rs. ${maxAdvanceAmount.toLocaleString('en-PK')} of Rs. ${totalGpFundBalance.toLocaleString('en-PK')}).`,
      );
    }

    const monthlyInstallment = calculateAdvanceMonthlyInstallment(
      dto.advanceAmount,
      dto.installmentMonths,
    );

    const advance = this.advanceRepository.create({
      employeeId: dto.employeeId,
      advanceAmount: dto.advanceAmount,
      installmentMonths: dto.installmentMonths,
      monthlyInstallment,
      amountRepaid: 0,
      installmentsPaid: 0,
      status: GpFundAdvanceStatus.ACTIVE,
      takenDate: dto.takenDate,
      notes: dto.notes?.trim() || null,
    });

    const savedAdvance = await this.advanceRepository.save(advance);
    await this.backfillPastInstallments(savedAdvance);
    return this.findOne(savedAdvance.id);
  }

  /**
   * If the advance's takenDate falls on or before an already-generated payroll
   * month, that payroll was created before this advance existed and never got
   * its installment deducted. Catch those up now — in chronological order,
   * one installment per already-existing payroll — until either the advance
   * is fully repaid or we run out of past payrolls.
   */
  private async backfillPastInstallments(advance: GpFundAdvance): Promise<void> {
    const takenDate = new Date(advance.takenDate);
    const takenYear = takenDate.getFullYear();
    const takenMonth = takenDate.getMonth() + 1;

    const payrolls = await this.payrollsRepository.find({
      where: { employeeId: advance.employeeId },
      relations: { deductions: true },
    });

    const eligiblePayrolls = payrolls
      .filter((payroll) => {
        if (payroll.year > takenYear) return true;
        if (payroll.year < takenYear) return false;
        return payroll.month >= takenMonth;
      })
      .filter((payroll) => !payroll.deductions?.some((d) => d.code === GP_FUND_ADVANCE_CODE))
      .sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year));

    let workingAdvance = advance;

    for (const payroll of eligiblePayrolls) {
      if (getAdvanceRemainingBalance(workingAdvance) <= 0) break;

      const amount = calculateAdvanceInstallmentAmount(workingAdvance);
      if (amount <= 0) break;

      const installmentNumber = workingAdvance.installmentsPaid + 1;

      await this.payrollDeductionRepository.save(
        this.payrollDeductionRepository.create({
          payrollId: payroll.id,
          name: `GP Fund Advance Installment (${installmentNumber}/${workingAdvance.installmentMonths})`,
          code: GP_FUND_ADVANCE_CODE,
          category: DeductionCategory.GP_FUND,
          amount,
          calculationType: DeductionCalculationType.FIXED,
          appliedRate: null,
          appliedFixedAmount: Number(workingAdvance.monthlyInstallment),
          sourceSubTaxId: null,
        }),
      );

      payroll.totalDeductions = roundAmount(Number(payroll.totalDeductions) + amount);
      payroll.netSalary = roundAmount(Number(payroll.netSalary) - amount);
      await this.payrollsRepository.save(payroll);

      workingAdvance.amountRepaid = roundAmount(Number(workingAdvance.amountRepaid) + amount);
      workingAdvance.installmentsPaid += 1;
      if (getAdvanceRemainingBalance(workingAdvance) <= 0) {
        workingAdvance.status = GpFundAdvanceStatus.COMPLETED;
      }
      workingAdvance = await this.advanceRepository.save(workingAdvance);

      await this.paymentRepository.save(
        this.paymentRepository.create({
          advanceId: workingAdvance.id,
          payrollId: payroll.id,
          amount,
          month: payroll.month,
          year: payroll.year,
        }),
      );
    }
  }

  async cancel(id: number): Promise<GpFundAdvance> {
    const advance = await this.findOne(id);
    if (advance.status !== GpFundAdvanceStatus.ACTIVE) {
      throw new BadRequestException('Only active advances can be cancelled');
    }
    if (Number(advance.amountRepaid) > 0) {
      throw new BadRequestException(
        'Cannot cancel an advance that already has payroll repayments recorded',
      );
    }

    advance.status = GpFundAdvanceStatus.CANCELLED;
    return this.advanceRepository.save(advance);
  }

  async remove(id: number): Promise<{ message: string }> {
    const advance = await this.findOne(id);
    const paymentCount = advance.payments?.length ?? 0;

    if (paymentCount > 0 || Number(advance.amountRepaid) > 0) {
      throw new BadRequestException(
        'Cannot delete an advance that has payroll installment repayments recorded',
      );
    }

    await this.advanceRepository.remove(advance);
    return { message: 'GP Fund advance deleted successfully' };
  }

  async resolveInstallmentForPayroll(
    employeeId: number,
  ): Promise<GpFundAdvanceInstallmentResult | null> {
    const advance = await this.findActiveForEmployee(employeeId);
    if (!advance) return null;

    const remainingBefore = getAdvanceRemainingBalance(advance);
    if (remainingBefore <= 0) {
      advance.status = GpFundAdvanceStatus.COMPLETED;
      await this.advanceRepository.save(advance);
      return null;
    }

    const amount = calculateAdvanceInstallmentAmount(advance);
    if (amount <= 0) return null;

    return {
      advanceId: advance.id,
      amount,
      monthlyInstallment: Number(advance.monthlyInstallment),
      installmentMonths: advance.installmentMonths,
      remainingBefore,
      remainingAfter: roundAmount(remainingBefore - amount),
      installmentNumber: advance.installmentsPaid + 1,
    };
  }

  async recordPayrollInstallment(
    advanceId: number,
    payrollId: number,
    amount: number,
    month: number,
    year: number,
  ): Promise<void> {
    const advance = await this.findOne(advanceId);
    if (advance.status !== GpFundAdvanceStatus.ACTIVE) {
      throw new BadRequestException('GP Fund advance is not active');
    }

    const existing = await this.paymentRepository.findOne({
      where: { payrollId },
    });
    if (existing) {
      throw new BadRequestException('GP Fund advance payment already recorded for this payroll');
    }

    advance.amountRepaid = roundAmount(Number(advance.amountRepaid) + amount);
    advance.installmentsPaid += 1;

    const remaining = getAdvanceRemainingBalance(advance);
    if (remaining <= 0) {
      advance.status = GpFundAdvanceStatus.COMPLETED;
    }

    await this.advanceRepository.save(advance);
    await this.paymentRepository.save(
      this.paymentRepository.create({
        advanceId,
        payrollId,
        amount,
        month,
        year,
      }),
    );
  }

  async revertPaymentForPayroll(payrollId: number): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { payrollId },
      relations: { advance: true },
    });
    if (!payment) return;

    const advance = payment.advance;
    advance.amountRepaid = roundAmount(
      Math.max(0, Number(advance.amountRepaid) - Number(payment.amount)),
    );
    advance.installmentsPaid = Math.max(0, advance.installmentsPaid - 1);
    if (advance.status === GpFundAdvanceStatus.COMPLETED) {
      advance.status = GpFundAdvanceStatus.ACTIVE;
    }

    await this.advanceRepository.save(advance);
    await this.paymentRepository.remove(payment);
  }

  async getSummary() {
    const advances = await this.advanceRepository.find({
      relations: { employee: true, payments: true },
    });

    const activeAdvances = advances.filter((a) => a.status === GpFundAdvanceStatus.ACTIVE);
    const completedAdvances = advances.filter((a) => a.status === GpFundAdvanceStatus.COMPLETED);

    const totalAdvanced = advances
      .filter((a) => a.status !== GpFundAdvanceStatus.CANCELLED)
      .reduce((sum, a) => sum + Number(a.advanceAmount), 0);

    const totalRepaid = advances.reduce(
      (sum, a) => sum + Number(a.amountRepaid),
      0,
    );

    const totalOutstanding = activeAdvances.reduce(
      (sum, a) => sum + getAdvanceRemainingBalance(a),
      0,
    );

    const monthlyInstallmentsDue = activeAdvances.reduce(
      (sum, a) => sum + calculateAdvanceInstallmentAmount(a),
      0,
    );

    const totalInstallmentsCollected = advances.reduce(
      (sum, a) => sum + (a.payments?.length ?? 0),
      0,
    );

    return {
      totalAdvances: advances.filter((a) => a.status !== GpFundAdvanceStatus.CANCELLED).length,
      activeCount: activeAdvances.length,
      completedCount: completedAdvances.length,
      cancelledCount: advances.filter((a) => a.status === GpFundAdvanceStatus.CANCELLED).length,
      totalAdvanced: roundAmount(totalAdvanced),
      totalRepaid: roundAmount(totalRepaid),
      totalOutstanding: roundAmount(totalOutstanding),
      monthlyInstallmentsDue: roundAmount(monthlyInstallmentsDue),
      totalInstallmentsCollected,
      advances: advances.map((advance) => this.mapAdvanceRow(advance)),
    };
  }

  mapAdvanceRow(advance: GpFundAdvance) {
    const remaining = getAdvanceRemainingBalance(advance);
    return {
      id: advance.id,
      employeeId: advance.employeeId,
      employeeCode: advance.employee?.employeeCode ?? '',
      name: advance.employee?.name ?? '',
      fatherName: advance.employee?.fatherName ?? '',
      designation: advance.employee?.designation ?? '',
      gpFundScale: advance.employee?.gpFund ?? null,
      advanceAmount: roundAmount(advance.advanceAmount),
      installmentMonths: advance.installmentMonths,
      monthlyInstallment: roundAmount(advance.monthlyInstallment),
      amountRepaid: roundAmount(advance.amountRepaid),
      remainingBalance: remaining,
      installmentsPaid: advance.installmentsPaid,
      installmentsRemaining: Math.max(0, advance.installmentMonths - advance.installmentsPaid),
      status: advance.status,
      takenDate: advance.takenDate,
      notes: advance.notes,
      payments: (advance.payments ?? [])
        .sort((a, b) => (a.year === b.year ? b.month - a.month : b.year - a.year))
        .map((payment) => ({
          id: payment.id,
          payrollId: payment.payrollId,
          amount: roundAmount(payment.amount),
          month: payment.month,
          year: payment.year,
        })),
    };
  }

  getDeductionCode(): string {
    return GP_FUND_ADVANCE_CODE;
  }
}
