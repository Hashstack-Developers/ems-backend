import { EmployeesService } from '../employees/employees.service';
import { PayrollsService } from '../payrolls/payrolls.service';
import { TaxSlabsService } from '../tax-slabs/tax-slabs.service';
export type ReportType = 'employees' | 'payrolls' | 'taxes';
export type ReportFormat = 'csv' | 'pdf';
export declare class ReportsService {
    private readonly employeesService;
    private readonly payrollsService;
    private readonly taxSlabsService;
    constructor(employeesService: EmployeesService, payrollsService: PayrollsService, taxSlabsService: TaxSlabsService);
    generate(type: ReportType, format: ReportFormat, month?: number, year?: number): Promise<{
        buffer: Buffer;
        filename: string;
        contentType: string;
    }>;
    private generateCsv;
    private generatePdf;
    private renderEmployeesPdf;
    private renderPayrollsPdf;
    private renderTaxesPdf;
}
