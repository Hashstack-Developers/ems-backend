import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payroll } from '../payrolls/entities/payroll.entity';
import { GpFundOverviewQueryDto } from './dto/gp-fund-overview-query.dto';
import { GpFundScale } from './entities/gp-fund-scale.entity';
import { GP_FUND_DEDUCTION_CODE, resolveGpFundAmount } from './gp-fund.utils';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class GpFundOverviewService {
  constructor(
    @InjectRepository(Payroll)
    private readonly payrollsRepository: Repository<Payroll>,
    @InjectRepository(GpFundScale)
    private readonly gpFundScaleRepository: Repository<GpFundScale>,
  ) {}

  async getOverview(query: GpFundOverviewQueryDto) {
    const scaleMap = await this.loadScaleMap();
    const payrolls = await this.buildPayrollQuery(query).getMany();
    const availableYears = await this.getAvailableYears();

    const summary = {
      payrollCount: 0,
      employeeCount: 0,
      enrolledEmployeeCount: 0,
      totalCollected: 0,
      avgMonthlyContribution: 0,
      scaleCount: 0,
    };

    const monthMap = new Map<string, {
      year: number;
      month: number;
      label: string;
      payrollCount: number;
      employeeCount: Set<number>;
      totalCollected: number;
    }>();

    const yearMap = new Map<number, {
      year: number;
      payrollCount: number;
      employeeCount: Set<number>;
      totalCollected: number;
    }>();

    const scaleUsageMap = new Map<string, {
      scaleCode: string;
      subscriptionValue: number;
      payrollCount: number;
      employeeCount: Set<number>;
      totalCollected: number;
    }>();

    const employeeMap = new Map<number, {
      employeeId: number;
      employeeCode: string;
      name: string;
      designation: string;
      gpFundScale: string | null;
      subscriptionValue: number;
      payrollCount: number;
      totalCollected: number;
    }>();

    const enrolledEmployees = new Set<number>();
    const usedScales = new Set<string>();

    for (const payroll of payrolls) {
      const employee = payroll.employee;
      const { scaleCode, subscriptionValue, amount: gpFundAmount } =
        this.resolvePayrollGpFund(payroll, scaleMap);

      if (gpFundAmount <= 0) continue;

      summary.payrollCount += 1;
      summary.totalCollected = round(summary.totalCollected + gpFundAmount);
      enrolledEmployees.add(payroll.employeeId);
      if (scaleCode) usedScales.add(scaleCode);

      const monthKey = `${payroll.year}-${payroll.month}`;
      const monthEntry = monthMap.get(monthKey) ?? {
        year: payroll.year,
        month: payroll.month,
        label: `${MONTH_NAMES[payroll.month - 1]} ${payroll.year}`,
        payrollCount: 0,
        employeeCount: new Set<number>(),
        totalCollected: 0,
      };
      monthEntry.payrollCount += 1;
      monthEntry.employeeCount.add(payroll.employeeId);
      monthEntry.totalCollected = round(monthEntry.totalCollected + gpFundAmount);
      monthMap.set(monthKey, monthEntry);

      const yearEntry = yearMap.get(payroll.year) ?? {
        year: payroll.year,
        payrollCount: 0,
        employeeCount: new Set<number>(),
        totalCollected: 0,
      };
      yearEntry.payrollCount += 1;
      yearEntry.employeeCount.add(payroll.employeeId);
      yearEntry.totalCollected = round(yearEntry.totalCollected + gpFundAmount);
      yearMap.set(payroll.year, yearEntry);

      if (scaleCode) {
        const scaleEntry = scaleUsageMap.get(scaleCode) ?? {
          scaleCode,
          subscriptionValue,
          payrollCount: 0,
          employeeCount: new Set<number>(),
          totalCollected: 0,
        };
        scaleEntry.payrollCount += 1;
        scaleEntry.employeeCount.add(payroll.employeeId);
        scaleEntry.totalCollected = round(scaleEntry.totalCollected + gpFundAmount);
        scaleUsageMap.set(scaleCode, scaleEntry);
      }

      if (employee) {
        const empEntry = employeeMap.get(payroll.employeeId) ?? {
          employeeId: payroll.employeeId,
          employeeCode: employee.employeeCode,
          name: employee.name,
          designation: employee.designation,
          gpFundScale: scaleCode,
          subscriptionValue,
          payrollCount: 0,
          totalCollected: 0,
        };
        empEntry.payrollCount += 1;
        empEntry.totalCollected = round(empEntry.totalCollected + gpFundAmount);
        employeeMap.set(payroll.employeeId, empEntry);
      }
    }

    summary.employeeCount = new Set(payrolls.map((p) => p.employeeId)).size;
    summary.enrolledEmployeeCount = enrolledEmployees.size;
    summary.scaleCount = usedScales.size;
    summary.avgMonthlyContribution = summary.payrollCount > 0
      ? round(summary.totalCollected / summary.payrollCount)
      : 0;

    const byMonth = [...monthMap.values()]
      .map((entry) => ({
        year: entry.year,
        month: entry.month,
        label: entry.label,
        payrollCount: entry.payrollCount,
        employeeCount: entry.employeeCount.size,
        totalCollected: entry.totalCollected,
      }))
      .sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year));

    const byYear = [...yearMap.values()]
      .map((entry) => ({
        year: entry.year,
        payrollCount: entry.payrollCount,
        employeeCount: entry.employeeCount.size,
        totalCollected: entry.totalCollected,
      }))
      .sort((a, b) => a.year - b.year);

    const byScale = [...scaleUsageMap.values()]
      .map((entry) => ({
        scaleCode: entry.scaleCode,
        subscriptionValue: entry.subscriptionValue,
        payrollCount: entry.payrollCount,
        employeeCount: entry.employeeCount.size,
        totalCollected: entry.totalCollected,
      }))
      .sort((a, b) => b.totalCollected - a.totalCollected);

    const byEmployee = [...employeeMap.values()].sort(
      (a, b) => b.totalCollected - a.totalCollected,
    );

    const records = payrolls
      .map((payroll) => {
        const employee = payroll.employee;
        const { scaleCode, subscriptionValue, amount: gpFundAmount } =
          this.resolvePayrollGpFund(payroll, scaleMap);

        return {
          payrollId: payroll.id,
          employeeId: payroll.employeeId,
          employeeCode: employee?.employeeCode ?? '',
          name: employee?.name ?? '',
          designation: employee?.designation ?? '',
          month: payroll.month,
          year: payroll.year,
          label: `${MONTH_NAMES[payroll.month - 1]} ${payroll.year}`,
          gpFundScale: scaleCode,
          subscriptionValue,
          gpFundAmount,
          grossSalary: Number(payroll.grossSalary),
        };
      })
      .filter((row) => row.gpFundAmount > 0);

    return {
      summary,
      byMonth,
      byYear,
      byScale,
      byEmployee,
      records,
      availableYears,
      filters: {
        employeeId: query.employeeId ?? null,
        years: query.years ?? [],
        months: query.months ?? [],
      },
    };
  }

  async getDashboardSummary() {
    const overview = await this.getOverview({});
    const recentMonths = overview.byMonth.slice(-6);

    return {
      totalCollected: overview.summary.totalCollected,
      enrolledEmployees: overview.summary.enrolledEmployeeCount,
      contributingRecords: overview.summary.payrollCount,
      avgMonthlyContribution: overview.summary.avgMonthlyContribution,
      scaleCount: overview.summary.scaleCount,
      byMonth: recentMonths,
    };
  }

  private async loadScaleMap(): Promise<Map<string, number>> {
    const scales = await this.gpFundScaleRepository.find();
    const map = new Map<string, number>();
    for (const scale of scales) {
      map.set(scale.code.toUpperCase(), Number(scale.value));
    }
    return map;
  }

  private resolvePayrollGpFund(
    payroll: Payroll,
    scaleMap: Map<string, number>,
  ): { scaleCode: string | null; subscriptionValue: number; amount: number } {
    const gpFundDeduction = payroll.deductions?.find(
      (deduction) => deduction.code === GP_FUND_DEDUCTION_CODE,
    );

    if (gpFundDeduction) {
      const amount = Number(gpFundDeduction.amount);
      const subscriptionValue = gpFundDeduction.appliedFixedAmount != null
        ? Number(gpFundDeduction.appliedFixedAmount)
        : amount;
      const scaleCode = payroll.employee?.gpFund?.trim().toUpperCase()
        ?? this.extractScaleFromDeductionName(gpFundDeduction.name);

      return {
        scaleCode,
        subscriptionValue,
        amount,
      };
    }

    if (!payroll.employee) {
      return { scaleCode: null, subscriptionValue: 0, amount: 0 };
    }

    return resolveGpFundAmount(payroll.employee, scaleMap);
  }

  private extractScaleFromDeductionName(name: string): string | null {
    const match = name.match(/GP Fund \(([^)]+)\)/i);
    return match?.[1]?.trim().toUpperCase() ?? null;
  }

  private buildPayrollQuery(query: GpFundOverviewQueryDto) {
    const qb = this.payrollsRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.employee', 'e')
      .leftJoinAndSelect('p.deductions', 'd');

    if (query.employeeId) {
      qb.andWhere('p.employee_id = :employeeId', { employeeId: query.employeeId });
    }
    if (query.years?.length) {
      qb.andWhere('p.year IN (:...years)', { years: query.years });
    }
    if (query.months?.length) {
      qb.andWhere('p.month IN (:...months)', { months: query.months });
    }

    return qb
      .orderBy('p.year', 'DESC')
      .addOrderBy('p.month', 'DESC')
      .addOrderBy('e.name', 'ASC');
  }

  private async getAvailableYears(): Promise<number[]> {
    const rows = await this.payrollsRepository
      .createQueryBuilder('p')
      .select('DISTINCT p.year', 'year')
      .orderBy('p.year', 'DESC')
      .getRawMany<{ year: string }>();

    return rows.map((row) => parseInt(row.year, 10)).filter((year) => !Number.isNaN(year));
  }
}
