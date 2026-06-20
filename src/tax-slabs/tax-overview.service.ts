import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GP_FUND_DEDUCTION_CODE } from '../gp-fund/gp-fund.utils';
import { Payroll } from '../payrolls/entities/payroll.entity';
import {
  DeductionCategory,
  PayrollDeduction,
} from '../payrolls/entities/payroll-deduction.entity';
import { TaxOverviewQueryDto } from './dto/tax-overview-query.dto';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function isTaxDeduction(deduction: PayrollDeduction): boolean {
  if (deduction.code === GP_FUND_DEDUCTION_CODE) return false;
  if (deduction.category === DeductionCategory.GP_FUND) return false;
  return (
    deduction.category === DeductionCategory.INCOME_TAX
    || deduction.category === DeductionCategory.SUB_TAX
  );
}

function summarizePayrollTaxes(payroll: Payroll) {
  const gross = Number(payroll.grossSalary);
  const taxDeductions = (payroll.deductions ?? []).filter(isTaxDeduction);

  if (taxDeductions.length > 0) {
    let incomeTax = 0;
    let subTaxes = 0;

    for (const deduction of taxDeductions) {
      const amount = Number(deduction.amount);
      if (deduction.category === DeductionCategory.INCOME_TAX) {
        incomeTax = round(incomeTax + amount);
      } else {
        subTaxes = round(subTaxes + amount);
      }
    }

    const totalDeductions = round(incomeTax + subTaxes);
    return {
      gross,
      incomeTax,
      subTaxes,
      totalDeductions,
      netSalary: round(gross - totalDeductions),
    };
  }

  // Legacy payrolls without deduction rows — totalDeductions was tax-only before GP Fund existed
  const incomeTax = Number(payroll.incomeTax);
  const totalDeductions = Number(payroll.totalDeductions);
  const subTaxes = round(totalDeductions - incomeTax);

  return {
    gross,
    incomeTax,
    subTaxes,
    totalDeductions,
    netSalary: Number(payroll.netSalary),
  };
}

@Injectable()
export class TaxOverviewService {
  constructor(
    @InjectRepository(Payroll)
    private readonly payrollsRepository: Repository<Payroll>,
  ) {}

  async getOverview(query: TaxOverviewQueryDto) {
    const payrolls = await this.buildPayrollQuery(query).getMany();
    const availableYears = await this.getAvailableYears();

    const summary = {
      payrollCount: payrolls.length,
      employeeCount: new Set(payrolls.map((p) => p.employeeId)).size,
      totalGross: 0,
      totalIncomeTax: 0,
      totalSubTaxes: 0,
      totalDeductions: 0,
      totalNet: 0,
    };

    const monthMap = new Map<string, {
      year: number;
      month: number;
      label: string;
      payrollCount: number;
      employeeCount: Set<number>;
      totalGross: number;
      totalIncomeTax: number;
      totalSubTaxes: number;
      totalDeductions: number;
      totalNet: number;
    }>();

    const yearMap = new Map<number, {
      year: number;
      payrollCount: number;
      employeeCount: Set<number>;
      totalGross: number;
      totalIncomeTax: number;
      totalSubTaxes: number;
      totalDeductions: number;
      totalNet: number;
    }>();

    const slabMap = new Map<string, {
      taxSlabId: number | null;
      taxSlabName: string;
      payrollCount: number;
      totalIncomeTax: number;
      totalSubTaxes: number;
      totalDeductions: number;
    }>();

    const employeeMap = new Map<number, {
      employeeId: number;
      employeeCode: string;
      name: string;
      designation: string;
      payrollCount: number;
      totalIncomeTax: number;
      totalSubTaxes: number;
      totalDeductions: number;
      totalGross: number;
    }>();

    const deductionMap = new Map<string, {
      code: string;
      name: string;
      category: string;
      amount: number;
      count: number;
    }>();

    for (const payroll of payrolls) {
      const {
        gross,
        incomeTax,
        subTaxes,
        totalDeductions,
        netSalary: net,
      } = summarizePayrollTaxes(payroll);

      summary.totalGross = round(summary.totalGross + gross);
      summary.totalIncomeTax = round(summary.totalIncomeTax + incomeTax);
      summary.totalSubTaxes = round(summary.totalSubTaxes + subTaxes);
      summary.totalDeductions = round(summary.totalDeductions + totalDeductions);
      summary.totalNet = round(summary.totalNet + net);

      const monthKey = `${payroll.year}-${payroll.month}`;
      const monthEntry = monthMap.get(monthKey) ?? {
        year: payroll.year,
        month: payroll.month,
        label: `${MONTH_NAMES[payroll.month - 1]} ${payroll.year}`,
        payrollCount: 0,
        employeeCount: new Set<number>(),
        totalGross: 0,
        totalIncomeTax: 0,
        totalSubTaxes: 0,
        totalDeductions: 0,
        totalNet: 0,
      };
      monthEntry.payrollCount += 1;
      monthEntry.employeeCount.add(payroll.employeeId);
      monthEntry.totalGross = round(monthEntry.totalGross + gross);
      monthEntry.totalIncomeTax = round(monthEntry.totalIncomeTax + incomeTax);
      monthEntry.totalSubTaxes = round(monthEntry.totalSubTaxes + subTaxes);
      monthEntry.totalDeductions = round(monthEntry.totalDeductions + totalDeductions);
      monthEntry.totalNet = round(monthEntry.totalNet + net);
      monthMap.set(monthKey, monthEntry);

      const yearEntry = yearMap.get(payroll.year) ?? {
        year: payroll.year,
        payrollCount: 0,
        employeeCount: new Set<number>(),
        totalGross: 0,
        totalIncomeTax: 0,
        totalSubTaxes: 0,
        totalDeductions: 0,
        totalNet: 0,
      };
      yearEntry.payrollCount += 1;
      yearEntry.employeeCount.add(payroll.employeeId);
      yearEntry.totalGross = round(yearEntry.totalGross + gross);
      yearEntry.totalIncomeTax = round(yearEntry.totalIncomeTax + incomeTax);
      yearEntry.totalSubTaxes = round(yearEntry.totalSubTaxes + subTaxes);
      yearEntry.totalDeductions = round(yearEntry.totalDeductions + totalDeductions);
      yearEntry.totalNet = round(yearEntry.totalNet + net);
      yearMap.set(payroll.year, yearEntry);

      const slabName = payroll.taxSlabName ?? 'No applicable slab';
      const slabKey = `${payroll.taxSlabId ?? 'none'}:${slabName}`;
      const slabEntry = slabMap.get(slabKey) ?? {
        taxSlabId: payroll.taxSlabId,
        taxSlabName: slabName,
        payrollCount: 0,
        totalIncomeTax: 0,
        totalSubTaxes: 0,
        totalDeductions: 0,
      };
      slabEntry.payrollCount += 1;
      slabEntry.totalIncomeTax = round(slabEntry.totalIncomeTax + incomeTax);
      slabEntry.totalSubTaxes = round(slabEntry.totalSubTaxes + subTaxes);
      slabEntry.totalDeductions = round(slabEntry.totalDeductions + totalDeductions);
      slabMap.set(slabKey, slabEntry);

      if (payroll.employee) {
        const empEntry = employeeMap.get(payroll.employeeId) ?? {
          employeeId: payroll.employeeId,
          employeeCode: payroll.employee.employeeCode,
          name: payroll.employee.name,
          designation: payroll.employee.designation,
          payrollCount: 0,
          totalIncomeTax: 0,
          totalSubTaxes: 0,
          totalDeductions: 0,
          totalGross: 0,
        };
        empEntry.payrollCount += 1;
        empEntry.totalIncomeTax = round(empEntry.totalIncomeTax + incomeTax);
        empEntry.totalSubTaxes = round(empEntry.totalSubTaxes + subTaxes);
        empEntry.totalDeductions = round(empEntry.totalDeductions + totalDeductions);
        empEntry.totalGross = round(empEntry.totalGross + gross);
        employeeMap.set(payroll.employeeId, empEntry);
      }

      for (const deduction of payroll.deductions ?? []) {
        if (!isTaxDeduction(deduction)) continue;

        const dedKey = `${deduction.code}:${deduction.category}`;
        const dedEntry = deductionMap.get(dedKey) ?? {
          code: deduction.code,
          name: deduction.name,
          category: deduction.category,
          amount: 0,
          count: 0,
        };
        dedEntry.amount = round(dedEntry.amount + Number(deduction.amount));
        dedEntry.count += 1;
        deductionMap.set(dedKey, dedEntry);
      }
    }

    const byMonth = [...monthMap.values()]
      .map((entry) => ({
        year: entry.year,
        month: entry.month,
        label: entry.label,
        payrollCount: entry.payrollCount,
        employeeCount: entry.employeeCount.size,
        totalGross: entry.totalGross,
        totalIncomeTax: entry.totalIncomeTax,
        totalSubTaxes: entry.totalSubTaxes,
        totalDeductions: entry.totalDeductions,
        totalNet: entry.totalNet,
      }))
      .sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year));

    const byYear = [...yearMap.values()]
      .map((entry) => ({
        year: entry.year,
        payrollCount: entry.payrollCount,
        employeeCount: entry.employeeCount.size,
        totalGross: entry.totalGross,
        totalIncomeTax: entry.totalIncomeTax,
        totalSubTaxes: entry.totalSubTaxes,
        totalDeductions: entry.totalDeductions,
        totalNet: entry.totalNet,
      }))
      .sort((a, b) => a.year - b.year);

    const bySlab = [...slabMap.values()].sort(
      (a, b) => b.totalDeductions - a.totalDeductions,
    );

    const byEmployee = [...employeeMap.values()].sort(
      (a, b) => b.totalDeductions - a.totalDeductions,
    );

    const byDeduction = [...deductionMap.values()].sort(
      (a, b) => b.amount - a.amount,
    );

    const records = payrolls.map((payroll) => {
      const {
        gross,
        incomeTax,
        subTaxes,
        totalDeductions,
        netSalary,
      } = summarizePayrollTaxes(payroll);

      return {
        payrollId: payroll.id,
        employeeId: payroll.employeeId,
        employeeCode: payroll.employee?.employeeCode ?? '',
        name: payroll.employee?.name ?? '',
        designation: payroll.employee?.designation ?? '',
        month: payroll.month,
        year: payroll.year,
        label: `${MONTH_NAMES[payroll.month - 1]} ${payroll.year}`,
        grossSalary: gross,
        incomeTax,
        subTaxes,
        totalDeductions,
        netSalary,
        taxSlabName: payroll.taxSlabName,
        appliedTaxRate: payroll.appliedTaxRate != null ? Number(payroll.appliedTaxRate) : null,
      };
    });

    return {
      summary,
      byMonth,
      byYear,
      bySlab,
      byEmployee,
      byDeduction,
      records,
      availableYears,
      filters: {
        employeeId: query.employeeId ?? null,
        years: query.years ?? [],
        months: query.months ?? [],
      },
    };
  }

  private buildPayrollQuery(query: TaxOverviewQueryDto) {
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

  async getDashboardSummary() {
    const overview = await this.getOverview({});
    const recentMonths = overview.byMonth.slice(-6);

    return {
      totalCollected: overview.summary.totalDeductions,
      totalIncomeTax: overview.summary.totalIncomeTax,
      totalSubTaxes: overview.summary.totalSubTaxes,
      payrollRecords: overview.summary.payrollCount,
      employeeCount: overview.summary.employeeCount,
      byMonth: recentMonths,
    };
  }
}
