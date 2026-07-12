import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payroll } from '../payrolls/entities/payroll.entity';
import { roundAmount } from '../common/utils/currency.utils';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface AllowanceOverviewQuery {
  type?: 'welfare' | 'management' | 'all';
  years?: number[];
  months?: number[];
}

@Injectable()
export class AllowanceOverviewService {
  constructor(
    @InjectRepository(Payroll)
    private readonly payrollsRepo: Repository<Payroll>,
  ) {}

  async getOverview(query: AllowanceOverviewQuery = {}) {
    const payrolls = await this.buildQuery(query).getMany();
    const availableYears = await this.getAvailableYears();

    const summary = {
      payrollCount: 0,
      employeeCount: 0,
      totalWelfareAmount: 0,
      totalManagementAmount: 0,
      totalAllowanceAmount: 0,
      avgWelfarePerPayroll: 0,
      avgManagementPerPayroll: 0,
    };

    const monthMap = new Map<string, {
      year: number; month: number; label: string;
      payrollCount: number; welfareTotal: number; managementTotal: number; totalAmount: number;
      employeeIds: Set<number>;
    }>();

    const yearMap = new Map<number, {
      year: number; payrollCount: number; welfareTotal: number; managementTotal: number; totalAmount: number;
      employeeIds: Set<number>;
    }>();

    const employeeMap = new Map<number, {
      employeeId: number; employeeCode: string; name: string; designation: string;
      payrollCount: number; welfareTotal: number; managementTotal: number; totalAmount: number;
    }>();

    const allEmployeeIds = new Set<number>();

    for (const payroll of payrolls) {
      const welfare = roundAmount(payroll.welfareAllowanceAmount ?? 0);
      const management = roundAmount(payroll.managementAllowanceAmount ?? 0);
      const total = roundAmount(welfare + management);

      const showWelfare = query.type !== 'management';
      const showManagement = query.type !== 'welfare';
      const relevantTotal = roundAmount(
        (showWelfare ? welfare : 0) + (showManagement ? management : 0),
      );

      if (relevantTotal <= 0) continue;

      allEmployeeIds.add(payroll.employeeId);
      summary.payrollCount += 1;
      summary.totalWelfareAmount = roundAmount(summary.totalWelfareAmount + (showWelfare ? welfare : 0));
      summary.totalManagementAmount = roundAmount(summary.totalManagementAmount + (showManagement ? management : 0));
      summary.totalAllowanceAmount = roundAmount(summary.totalAllowanceAmount + relevantTotal);

      const monthKey = `${payroll.year}-${payroll.month}`;
      const mEntry = monthMap.get(monthKey) ?? {
        year: payroll.year, month: payroll.month,
        label: `${MONTH_NAMES[payroll.month - 1]} ${payroll.year}`,
        payrollCount: 0, welfareTotal: 0, managementTotal: 0, totalAmount: 0,
        employeeIds: new Set<number>(),
      };
      mEntry.payrollCount += 1;
      mEntry.employeeIds.add(payroll.employeeId);
      mEntry.welfareTotal = roundAmount(mEntry.welfareTotal + welfare);
      mEntry.managementTotal = roundAmount(mEntry.managementTotal + management);
      mEntry.totalAmount = roundAmount(mEntry.totalAmount + relevantTotal);
      monthMap.set(monthKey, mEntry);

      const yEntry = yearMap.get(payroll.year) ?? {
        year: payroll.year, payrollCount: 0, welfareTotal: 0, managementTotal: 0, totalAmount: 0,
        employeeIds: new Set<number>(),
      };
      yEntry.payrollCount += 1;
      yEntry.employeeIds.add(payroll.employeeId);
      yEntry.welfareTotal = roundAmount(yEntry.welfareTotal + welfare);
      yEntry.managementTotal = roundAmount(yEntry.managementTotal + management);
      yEntry.totalAmount = roundAmount(yEntry.totalAmount + relevantTotal);
      yearMap.set(payroll.year, yEntry);

      const emp = payroll.employee;
      if (emp) {
        const eEntry = employeeMap.get(payroll.employeeId) ?? {
          employeeId: payroll.employeeId,
          employeeCode: emp.employeeCode,
          name: emp.name,
          designation: emp.designation,
          payrollCount: 0, welfareTotal: 0, managementTotal: 0, totalAmount: 0,
        };
        eEntry.payrollCount += 1;
        eEntry.welfareTotal = roundAmount(eEntry.welfareTotal + welfare);
        eEntry.managementTotal = roundAmount(eEntry.managementTotal + management);
        eEntry.totalAmount = roundAmount(eEntry.totalAmount + relevantTotal);
        employeeMap.set(payroll.employeeId, eEntry);
      }
    }

    summary.employeeCount = allEmployeeIds.size;
    summary.avgWelfarePerPayroll = summary.payrollCount > 0
      ? roundAmount(summary.totalWelfareAmount / summary.payrollCount) : 0;
    summary.avgManagementPerPayroll = summary.payrollCount > 0
      ? roundAmount(summary.totalManagementAmount / summary.payrollCount) : 0;

    const byMonth = [...monthMap.values()]
      .map((e) => ({ ...e, employeeCount: e.employeeIds.size, employeeIds: undefined }))
      .sort((a, b) => a.year === b.year ? a.month - b.month : a.year - b.year);

    const byYear = [...yearMap.values()]
      .map((e) => ({ ...e, employeeCount: e.employeeIds.size, employeeIds: undefined }))
      .sort((a, b) => a.year - b.year);

    const byEmployee = [...employeeMap.values()]
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const records = payrolls
      .map((p) => ({
        payrollId: p.id,
        employeeId: p.employeeId,
        employeeCode: p.employee?.employeeCode ?? '',
        name: p.employee?.name ?? '',
        designation: p.employee?.designation ?? '',
        month: p.month,
        year: p.year,
        label: `${MONTH_NAMES[p.month - 1]} ${p.year}`,
        welfareAmount: roundAmount(p.welfareAllowanceAmount ?? 0),
        managementAmount: roundAmount(p.managementAllowanceAmount ?? 0),
        totalAmount: roundAmount((p.welfareAllowanceAmount ?? 0) + (p.managementAllowanceAmount ?? 0)),
        grossSalary: roundAmount(p.grossSalary),
      }))
      .filter((r) => r.totalAmount > 0);

    return { summary, byMonth, byYear, byEmployee, records, availableYears };
  }

  async getDashboardSummary() {
    const overview = await this.getOverview({});
    return {
      totalWelfareAmount: overview.summary.totalWelfareAmount,
      totalManagementAmount: overview.summary.totalManagementAmount,
      totalAllowanceAmount: overview.summary.totalAllowanceAmount,
      enrolledEmployees: overview.summary.employeeCount,
      payrollCount: overview.summary.payrollCount,
      byMonth: overview.byMonth.slice(-6),
    };
  }

  private buildQuery(query: AllowanceOverviewQuery) {
    const qb = this.payrollsRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.employee', 'e')
      .where('(p.welfare_allowance_amount > 0 OR p.management_allowance_amount > 0)');

    if (query.years?.length) {
      qb.andWhere('p.year IN (:...years)', { years: query.years });
    }
    if (query.months?.length) {
      qb.andWhere('p.month IN (:...months)', { months: query.months });
    }

    return qb.orderBy('p.year', 'DESC').addOrderBy('p.month', 'DESC').addOrderBy('e.name', 'ASC');
  }

  private async getAvailableYears(): Promise<number[]> {
    const rows = await this.payrollsRepo
      .createQueryBuilder('p')
      .select('DISTINCT p.year', 'year')
      .where('p.welfare_allowance_amount > 0 OR p.management_allowance_amount > 0')
      .orderBy('p.year', 'DESC')
      .getRawMany<{ year: string }>();
    return rows.map((r) => parseInt(r.year, 10)).filter((y) => !Number.isNaN(y));
  }
}
