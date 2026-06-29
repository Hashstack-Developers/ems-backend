import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../employees/entities/employee.entity';
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
} from './gp-fund.utils';

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

    return this.advanceRepository.save(advance);
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
      remainingAfter: this.round(remainingBefore - amount),
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

    advance.amountRepaid = this.round(Number(advance.amountRepaid) + amount);
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
    advance.amountRepaid = this.round(
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
      totalAdvanced: this.round(totalAdvanced),
      totalRepaid: this.round(totalRepaid),
      totalOutstanding: this.round(totalOutstanding),
      monthlyInstallmentsDue: this.round(monthlyInstallmentsDue),
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
      designation: advance.employee?.designation ?? '',
      gpFundScale: advance.employee?.gpFund ?? null,
      advanceAmount: Number(advance.advanceAmount),
      installmentMonths: advance.installmentMonths,
      monthlyInstallment: Number(advance.monthlyInstallment),
      amountRepaid: Number(advance.amountRepaid),
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
          amount: Number(payment.amount),
          month: payment.month,
          year: payment.year,
        })),
    };
  }

  getDeductionCode(): string {
    return GP_FUND_ADVANCE_CODE;
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
