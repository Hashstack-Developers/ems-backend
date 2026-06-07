import { GeneratePayrollDto } from './dto/generate-payroll.dto';
import { PayrollsService } from './payrolls.service';
export declare class PayrollsController {
    private readonly payrollsService;
    constructor(payrollsService: PayrollsService);
    generate(dto: GeneratePayrollDto): Promise<{
        success: boolean;
        message: string;
        data: import("./entities/payroll.entity").Payroll[];
    }>;
    getSummary(month?: string, year?: string): Promise<{
        success: boolean;
        data: {
            count: number;
            totalGross: number;
            totalDeductions: number;
            totalNet: number;
        };
    }>;
    findAll(month?: string, year?: string): Promise<{
        success: boolean;
        data: import("./entities/payroll.entity").Payroll[];
    }>;
    findOne(id: number): Promise<{
        success: boolean;
        data: import("./entities/payroll.entity").Payroll;
    }>;
    remove(id: number): Promise<{
        success: boolean;
        message: string;
    }>;
}
