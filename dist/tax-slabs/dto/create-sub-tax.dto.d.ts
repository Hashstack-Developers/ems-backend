import { SubTaxType } from '../entities/sub-tax.entity';
export declare class CreateSubTaxDto {
    name: string;
    code: string;
    type: SubTaxType;
    rate?: number;
    amount?: number;
    description?: string;
    isActive?: boolean;
}
