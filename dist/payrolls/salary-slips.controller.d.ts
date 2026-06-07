import type { Response } from 'express';
import { GenerateSalarySlipDto } from './dto/generate-salary-slip.dto';
import { SalarySlipsService } from './salary-slips.service';
export declare class SalarySlipsController {
    private readonly salarySlipsService;
    constructor(salarySlipsService: SalarySlipsService);
    getAvailability(month: string, year: string): Promise<{
        success: boolean;
        data: import("./salary-slips.service").SalarySlipAvailability[];
    }>;
    generate(dto: GenerateSalarySlipDto): Promise<{
        success: boolean;
        data: import("./salary-slips.service").SalarySlip;
    }>;
    downloadPdf(payrollId: number, res: Response): Promise<void>;
}
