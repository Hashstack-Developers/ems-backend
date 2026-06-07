import { Payroll } from './payroll.entity';
export declare enum DeductionCategory {
    INCOME_TAX = "income_tax",
    SUB_TAX = "sub_tax"
}
export declare enum DeductionCalculationType {
    PERCENTAGE = "percentage",
    FIXED = "fixed"
}
export declare class PayrollDeduction {
    id: number;
    payrollId: number;
    payroll: Payroll;
    name: string;
    code: string;
    category: DeductionCategory;
    amount: number;
    calculationType: DeductionCalculationType | null;
    appliedRate: number | null;
    appliedFixedAmount: number | null;
    sourceSubTaxId: number | null;
    createdAt: Date;
}
