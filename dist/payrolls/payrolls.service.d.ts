import { Repository } from 'typeorm';
import { EmployeesService } from '../employees/employees.service';
import { TaxSlabsService } from '../tax-slabs/tax-slabs.service';
import { GeneratePayrollDto } from './dto/generate-payroll.dto';
import { PayrollDeduction } from './entities/payroll-deduction.entity';
import { Payroll } from './entities/payroll.entity';
export declare class PayrollsService {
    private readonly payrollsRepository;
    private readonly deductionsRepository;
    private readonly employeesService;
    private readonly taxSlabsService;
    constructor(payrollsRepository: Repository<Payroll>, deductionsRepository: Repository<PayrollDeduction>, employeesService: EmployeesService, taxSlabsService: TaxSlabsService);
    generate(dto: GeneratePayrollDto): Promise<Payroll[]>;
    findAll(month?: number, year?: number): Promise<Payroll[]>;
    findOne(id: number): Promise<Payroll>;
    remove(id: number): Promise<void>;
    getSummary(month?: number, year?: number): Promise<{
        count: number;
        totalGross: number;
        totalDeductions: number;
        totalNet: number;
    }>;
    getMonthlySummaries(): Promise<{
        month: number;
        year: number;
        label: string;
        count: number;
        totalGross: number;
        totalDeductions: number;
        totalNet: number;
    }[]>;
    private generateForEmployee;
    private round;
}
