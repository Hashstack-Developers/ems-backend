import { EmployeesService } from '../employees/employees.service';
import { PayrollsService } from '../payrolls/payrolls.service';
import { TaxSlabsService } from '../tax-slabs/tax-slabs.service';
export declare class DashboardService {
    private readonly employeesService;
    private readonly payrollsService;
    private readonly taxSlabsService;
    constructor(employeesService: EmployeesService, payrollsService: PayrollsService, taxSlabsService: TaxSlabsService);
    getStats(): Promise<{
        employees: {
            total: number;
            active: number;
            inactive: number;
        };
        taxes: {
            slabs: number;
            activeSlabs: number;
            subTaxes: number;
            activeSubTaxes: number;
        };
        payrollByMonth: {
            month: number;
            year: number;
            label: string;
            count: number;
            totalGross: number;
            totalDeductions: number;
            totalNet: number;
        }[];
        payrollTotals: {
            count: number;
            totalGross: number;
            totalDeductions: number;
            totalNet: number;
            monthsWithPayroll: number;
        };
    }>;
}
