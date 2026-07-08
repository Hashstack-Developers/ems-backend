import { roundAmount } from '../common/utils/currency.utils';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payroll } from '../payrolls/entities/payroll.entity';
import { GpFundOverviewQueryDto } from './dto/gp-fund-overview-query.dto';
import { GpFundScale } from './entities/gp-fund-scale.entity';
import { GpFundAdvanceService } from './gp-fund-advance.service';
import { GpFundService } from './gp-fund.service';
import { resolvePayrollGpFundDeductions } from './gp-fund.utils';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

@Injectable()
export class GpFundOverviewService {
  constructor(
    @InjectRepository(Payroll)
    private readonly payrollsRepository: Repository<Payroll>,
    @InjectRepository(GpFundScale)
    private readonly gpFundScaleRepository: Repository<GpFundScale>,
    private readonly gpFundService: GpFundService,
    private readonly gpFundAdvanceService: GpFundAdvanceService,
  ) {}

  async getOverview(query: GpFundOverviewQueryDto) {
    const scaleMap = await this.loadScaleMap();
    const markupSettings = await this.gpFundService.getMarkupSettings();
    const markupRates = this.gpFundService.getMarkupRatesFromSettings(markupSettings);
    const payrolls = await this.buildPayrollQuery(query).getMany();
    const availableYears = await this.getAvailableYears();

    const summary = {
      payrollCount: 0,
      employeeCount: 0,
      enrolledEmployeeCount: 0,
      totalBaseCollected: 0,
      totalAnnualMarkup: 0,
      totalAdvanceInstallments: 0,
      totalCollected: 0,
      avgMonthlyContribution: 0,
      scaleCount: 0,
      annualMarkupRate: markupRates.annualMarkupRate,
    };

    const monthMap = new Map<string, {
      year: number;
      month: number;
      label: string;
      payrollCount: number;
      employeeCount: Set<number>;
      totalBaseCollected: number;
      totalAnnualMarkup: number;
      totalCollected: number;
    }>();

    const yearMap = new Map<number, {
      year: number;
      payrollCount: number;
      employeeCount: Set<number>;
      totalBaseCollected: number;
      totalAnnualMarkup: number;
      totalCollected: number;
    }>();

    const scaleUsageMap = new Map<string, {
      scaleCode: string;
      subscriptionValue: number;
      payrollCount: number;
      employeeCount: Set<number>;
      totalBaseCollected: number;
      totalAnnualMarkup: number;
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
      totalBaseCollected: number;
      totalAnnualMarkup: number;
      totalCollected: number;
    }>();

    const enrolledEmployees = new Set<number>();
    const usedScales = new Set<string>();

    for (const payroll of payrolls) {
      const employee = payroll.employee;
      const breakdown = resolvePayrollGpFundDeductions(
        payroll.deductions,
        employee,
        scaleMap,
      );

      if (breakdown.totalAmount <= 0) continue;

      summary.payrollCount += 1;
      summary.totalBaseCollected = roundAmount(summary.totalBaseCollected + breakdown.baseAmount);
      summary.totalAnnualMarkup = roundAmount(summary.totalAnnualMarkup + breakdown.annualMarkupAmount);
      summary.totalAdvanceInstallments = roundAmount(
        summary.totalAdvanceInstallments + breakdown.advanceInstallmentAmount,
      );
      summary.totalCollected = roundAmount(summary.totalCollected + breakdown.totalAmount);
      enrolledEmployees.add(payroll.employeeId);
      if (breakdown.scaleCode) usedScales.add(breakdown.scaleCode);

      const monthKey = `${payroll.year}-${payroll.month}`;
      const monthEntry = monthMap.get(monthKey) ?? {
        year: payroll.year,
        month: payroll.month,
        label: `${MONTH_NAMES[payroll.month - 1]} ${payroll.year}`,
        payrollCount: 0,
        employeeCount: new Set<number>(),
        totalBaseCollected: 0,
        totalAnnualMarkup: 0,
        totalCollected: 0,
      };
      monthEntry.payrollCount += 1;
      monthEntry.employeeCount.add(payroll.employeeId);
      monthEntry.totalBaseCollected = roundAmount(monthEntry.totalBaseCollected + breakdown.baseAmount);
      monthEntry.totalAnnualMarkup = roundAmount(monthEntry.totalAnnualMarkup + breakdown.annualMarkupAmount);
      monthEntry.totalCollected = roundAmount(monthEntry.totalCollected + breakdown.totalAmount);
      monthMap.set(monthKey, monthEntry);

      const yearEntry = yearMap.get(payroll.year) ?? {
        year: payroll.year,
        payrollCount: 0,
        employeeCount: new Set<number>(),
        totalBaseCollected: 0,
        totalAnnualMarkup: 0,
        totalCollected: 0,
      };
      yearEntry.payrollCount += 1;
      yearEntry.employeeCount.add(payroll.employeeId);
      yearEntry.totalBaseCollected = roundAmount(yearEntry.totalBaseCollected + breakdown.baseAmount);
      yearEntry.totalAnnualMarkup = roundAmount(yearEntry.totalAnnualMarkup + breakdown.annualMarkupAmount);
      yearEntry.totalCollected = roundAmount(yearEntry.totalCollected + breakdown.totalAmount);
      yearMap.set(payroll.year, yearEntry);

      if (breakdown.scaleCode) {
        const scaleEntry = scaleUsageMap.get(breakdown.scaleCode) ?? {
          scaleCode: breakdown.scaleCode,
          subscriptionValue: breakdown.subscriptionValue,
          payrollCount: 0,
          employeeCount: new Set<number>(),
          totalBaseCollected: 0,
          totalAnnualMarkup: 0,
          totalCollected: 0,
        };
        scaleEntry.payrollCount += 1;
        scaleEntry.employeeCount.add(payroll.employeeId);
        scaleEntry.totalBaseCollected = roundAmount(scaleEntry.totalBaseCollected + breakdown.baseAmount);
        scaleEntry.totalAnnualMarkup = roundAmount(scaleEntry.totalAnnualMarkup + breakdown.annualMarkupAmount);
        scaleEntry.totalCollected = roundAmount(scaleEntry.totalCollected + breakdown.totalAmount);
        scaleUsageMap.set(breakdown.scaleCode, scaleEntry);
      }

      if (employee) {
        const empEntry = employeeMap.get(payroll.employeeId) ?? {
          employeeId: payroll.employeeId,
          employeeCode: employee.employeeCode,
          name: employee.name,
          designation: employee.designation,
          gpFundScale: breakdown.scaleCode,
          subscriptionValue: breakdown.subscriptionValue,
          payrollCount: 0,
          totalBaseCollected: 0,
          totalAnnualMarkup: 0,
          totalCollected: 0,
        };
        empEntry.payrollCount += 1;
        empEntry.totalBaseCollected = roundAmount(empEntry.totalBaseCollected + breakdown.baseAmount);
        empEntry.totalAnnualMarkup = roundAmount(empEntry.totalAnnualMarkup + breakdown.annualMarkupAmount);
        empEntry.totalCollected = roundAmount(empEntry.totalCollected + breakdown.totalAmount);
        employeeMap.set(payroll.employeeId, empEntry);
      }
    }

    summary.employeeCount = new Set(payrolls.map((p) => p.employeeId)).size;
    summary.enrolledEmployeeCount = enrolledEmployees.size;
    summary.scaleCount = usedScales.size;
    summary.avgMonthlyContribution = summary.payrollCount > 0
      ? roundAmount(summary.totalCollected / summary.payrollCount)
      : 0;

    const byMonth = [...monthMap.values()]
      .map((entry) => ({
        year: entry.year,
        month: entry.month,
        label: entry.label,
        payrollCount: entry.payrollCount,
        employeeCount: entry.employeeCount.size,
        totalBaseCollected: entry.totalBaseCollected,
        totalAnnualMarkup: entry.totalAnnualMarkup,
        totalCollected: entry.totalCollected,
      }))
      .sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year));

    const byYear = [...yearMap.values()]
      .map((entry) => ({
        year: entry.year,
        payrollCount: entry.payrollCount,
        employeeCount: entry.employeeCount.size,
        totalBaseCollected: entry.totalBaseCollected,
        totalAnnualMarkup: entry.totalAnnualMarkup,
        totalCollected: entry.totalCollected,
      }))
      .sort((a, b) => a.year - b.year);

    const byScale = [...scaleUsageMap.values()]
      .map((entry) => ({
        scaleCode: entry.scaleCode,
        subscriptionValue: entry.subscriptionValue,
        payrollCount: entry.payrollCount,
        employeeCount: entry.employeeCount.size,
        totalBaseCollected: entry.totalBaseCollected,
        totalAnnualMarkup: entry.totalAnnualMarkup,
        totalCollected: entry.totalCollected,
      }))
      .sort((a, b) => b.totalCollected - a.totalCollected);

    const byEmployee = [...employeeMap.values()].sort(
      (a, b) => b.totalCollected - a.totalCollected,
    );

    const records = payrolls
      .map((payroll) => {
        const employee = payroll.employee;
        const breakdown = resolvePayrollGpFundDeductions(
          payroll.deductions,
          employee,
          scaleMap,
        );

        return {
          payrollId: payroll.id,
          employeeId: payroll.employeeId,
          employeeCode: employee?.employeeCode ?? '',
          name: employee?.name ?? '',
          designation: employee?.designation ?? '',
          month: payroll.month,
          year: payroll.year,
          label: `${MONTH_NAMES[payroll.month - 1]} ${payroll.year}`,
          gpFundScale: breakdown.scaleCode,
          subscriptionValue: breakdown.subscriptionValue,
          gpFundBaseAmount: breakdown.baseAmount,
          monthlyMarkupAmount: breakdown.monthlyMarkupAmount,
          annualMarkupAmount: breakdown.annualMarkupAmount,
          advanceInstallmentAmount: breakdown.advanceInstallmentAmount,
          gpFundAmount: breakdown.totalAmount,
          grossSalary: roundAmount(payroll.grossSalary),
        };
      })
      .filter((row) => row.gpFundAmount > 0);

    const advances = await this.gpFundAdvanceService.getSummary();

    return {
      summary,
      byMonth,
      byYear,
      byScale,
      byEmployee,
      records,
      advances,
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
      totalBaseCollected: overview.summary.totalBaseCollected,
      totalAnnualMarkup: overview.summary.totalAnnualMarkup,
      totalAdvanceInstallments: overview.summary.totalAdvanceInstallments,
      annualMarkupRate: overview.summary.annualMarkupRate,
      advances: overview.advances,
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
