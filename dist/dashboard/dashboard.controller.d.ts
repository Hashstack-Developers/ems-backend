import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getStats(): Promise<{
        success: boolean;
        data: {
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
        };
    }>;
}
