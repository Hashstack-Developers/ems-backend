import { Repository } from 'typeorm';
import { EmployeesService } from '../employees/employees.service';
import { GenerateSalarySlipDto } from './dto/generate-salary-slip.dto';
import { Payroll, PayrollStatus } from './entities/payroll.entity';
export interface SalarySlipDeduction {
    name: string;
    code: string;
    category: string;
    calculationType: string | null;
    appliedRate: number | null;
    appliedFixedAmount: number | null;
    amount: number;
}
export interface SalarySlip {
    payrollId: number;
    slipNumber: string;
    period: {
        month: number;
        year: number;
        label: string;
    };
    employee: {
        id: number;
        employeeCode: string;
        firstName: string;
        lastName: string;
        fullName: string;
        department: string;
        designation: string;
        email: string;
        joinDate: string;
    };
    earnings: {
        basicSalary: number;
        grossSalary: number;
    };
    deductions: SalarySlipDeduction[];
    summary: {
        grossSalary: number;
        totalDeductions: number;
        netSalary: number;
        incomeTax: number;
        taxSlabName: string | null;
        appliedTaxRate: number | null;
    };
    status: PayrollStatus;
    generatedAt: string;
}
export interface SalarySlipAvailability {
    employeeId: number;
    employeeCode: string;
    fullName: string;
    department: string;
    designation: string;
    payrollId: number | null;
    payrollStatus: PayrollStatus | null;
    canGenerateSlip: boolean;
    message: string;
}
export declare class SalarySlipsService {
    private readonly payrollsRepository;
    private readonly employeesService;
    constructor(payrollsRepository: Repository<Payroll>, employeesService: EmployeesService);
    getAvailability(month: number, year: number): Promise<SalarySlipAvailability[]>;
    generate(dto: GenerateSalarySlipDto): Promise<SalarySlip>;
    generatePdf(payrollId: number): Promise<{
        buffer: Buffer;
        filename: string;
    }>;
    private mapPayrollToSlip;
    private isPayrollEligible;
    private validatePeriod;
    private renderPdf;
}
