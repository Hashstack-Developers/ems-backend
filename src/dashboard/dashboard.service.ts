import { Injectable } from '@nestjs/common';
import { EmployeesService } from '../employees/employees.service';
import { GpFundOverviewService } from '../gp-fund/gp-fund-overview.service';
import { PayrollsService } from '../payrolls/payrolls.service';
import { TaxOverviewService } from '../tax-slabs/tax-overview.service';
import { TaxSlabsService } from '../tax-slabs/tax-slabs.service';

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function monthKey(year: number, month: number): string {
  return `${year}-${month}`;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly payrollsService: PayrollsService,
    private readonly taxSlabsService: TaxSlabsService,
    private readonly taxOverviewService: TaxOverviewService,
    private readonly gpFundOverviewService: GpFundOverviewService,
  ) {}

  async getStats() {
    const [
      totalEmployees,
      activeEmployees,
      taxSlabs,
      subTaxes,
      payrollByMonth,
      taxCollection,
      gpFund,
    ] = await Promise.all([
      this.employeesService.count(),
      this.employeesService.countActive(),
      this.taxSlabsService.findAllTaxSlabs(),
      this.taxSlabsService.findAllSubTaxes(),
      this.payrollsService.getMonthlySummaries(),
      this.taxOverviewService.getDashboardSummary(),
      this.gpFundOverviewService.getDashboardSummary(),
    ]);

    const payrollTotals = payrollByMonth.reduce(
      (acc, p) => ({
        count: acc.count + p.count,
        totalGross: acc.totalGross + p.totalGross,
        totalDeductions: acc.totalDeductions + p.totalDeductions,
        totalNet: acc.totalNet + p.totalNet,
      }),
      { count: 0, totalGross: 0, totalDeductions: 0, totalNet: 0 },
    );

    const totalTaxDeductions = taxCollection.totalCollected;
    const totalGpFund = gpFund.totalCollected;
    const totalCombinedDeductions = round(totalTaxDeductions + totalGpFund);

    const taxByMonthMap = new Map(
      taxCollection.byMonth.map((row) => [monthKey(row.year, row.month), row]),
    );
    const gpByMonthMap = new Map(
      gpFund.byMonth.map((row) => [monthKey(row.year, row.month), row]),
    );

    const deductionsByMonth = payrollByMonth.map((row) => {
      const key = monthKey(row.year, row.month);
      const taxRow = taxByMonthMap.get(key);
      const gpRow = gpByMonthMap.get(key);

      return {
        month: row.month,
        year: row.year,
        label: row.label,
        totalTaxes: taxRow?.totalDeductions ?? 0,
        totalGpFund: gpRow?.totalCollected ?? 0,
        totalCombined: round((taxRow?.totalDeductions ?? 0) + (gpRow?.totalCollected ?? 0)),
      };
    });

    return {
      employees: {
        total: totalEmployees,
        active: activeEmployees,
        inactive: totalEmployees - activeEmployees,
      },
      taxes: {
        slabs: taxSlabs.length,
        activeSlabs: taxSlabs.filter((s) => s.isActive).length,
        subTaxes: subTaxes.length,
        activeSubTaxes: subTaxes.filter((s) => s.isActive).length,
      },
      taxCollection,
      gpFund,
      combined: {
        totalTaxDeductions,
        totalGpFund,
        totalCombinedDeductions,
      },
      payrollByMonth,
      deductionsByMonth,
      payrollTotals: {
        monthsWithPayroll: payrollByMonth.length,
        ...payrollTotals,
        totalTaxDeductions,
        totalGpFund,
        totalCombinedDeductions,
      },
    };
  }
}
