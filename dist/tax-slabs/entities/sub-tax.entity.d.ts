import { TaxSlab } from './tax-slab.entity';
export declare enum SubTaxType {
    PERCENTAGE = "percentage",
    FIXED = "fixed"
}
export declare class SubTax {
    id: number;
    taxSlabId: number | null;
    taxSlab: TaxSlab;
    name: string;
    code: string;
    type: SubTaxType;
    rate: number | null;
    amount: number | null;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
