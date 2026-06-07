import { Employee } from '../../employees/entities/employee.entity';
import { PayrollDeduction } from './payroll-deduction.entity';
export declare enum PayrollStatus {
    DRAFT = "draft",
    PROCESSED = "processed",
    PAID = "paid"
}
export declare class Payroll {
    id: number;
    employeeId: number;
    employee: Employee;
    month: number;
    year: number;
    basicSalary: number;
    grossSalary: number;
    incomeTax: number;
    totalDeductions: number;
    netSalary: number;
    taxSlabId: number | null;
    taxSlabName: string | null;
    appliedTaxRate: number | null;
    taxSlabMinSalary: number | null;
    taxSlabMaxSalary: number | null;
    status: PayrollStatus;
    deductions: PayrollDeduction[];
    createdAt: Date;
    updatedAt: Date;
}
