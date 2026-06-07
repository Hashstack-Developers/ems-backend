import { Injectable } from '@nestjs/common';
import { EmployeesService } from '../employees/employees.service';
import { PayrollsService } from '../payrolls/payrolls.service';
import { TaxSlabsService } from '../tax-slabs/tax-slabs.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly payrollsService: PayrollsService,
    private readonly taxSlabsService: TaxSlabsService,
  ) {}

  async getStats() {
    const [
      totalEmployees,
      activeEmployees,
      taxSlabs,
      subTaxes,
      payrollByMonth,
    ] = await Promise.all([
      this.employeesService.count(),
      this.employeesService.countActive(),
      this.taxSlabsService.findAllTaxSlabs(),
      this.taxSlabsService.findAllSubTaxes(),
      this.payrollsService.getMonthlySummaries(),
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
      payrollByMonth,
      payrollTotals: {
        monthsWithPayroll: payrollByMonth.length,
        ...payrollTotals,
      },
    };
  }
}
