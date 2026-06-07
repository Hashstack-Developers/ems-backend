import { SubTax } from './sub-tax.entity';
export declare class TaxSlab {
    id: number;
    name: string;
    minSalary: number;
    maxSalary: number | null;
    taxRate: number;
    description: string | null;
    isActive: boolean;
    subTaxes: SubTax[];
    createdAt: Date;
    updatedAt: Date;
}
