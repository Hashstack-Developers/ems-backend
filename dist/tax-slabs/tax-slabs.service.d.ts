import { Repository } from 'typeorm';
import { CreateSubTaxDto } from './dto/create-sub-tax.dto';
import { CreateTaxSlabDto } from './dto/create-tax-slab.dto';
import { UpdateSubTaxDto } from './dto/update-sub-tax.dto';
import { UpdateTaxSlabDto } from './dto/update-tax-slab.dto';
import { SubTax } from './entities/sub-tax.entity';
import { TaxSlab } from './entities/tax-slab.entity';
export interface TaxCalculationResult {
    taxSlab: TaxSlab | null;
    incomeTax: number;
    subTaxDeductions: Array<{
        subTax: SubTax;
        amount: number;
    }>;
    totalDeductions: number;
    netSalary: number;
}
export declare class TaxSlabsService {
    private readonly taxSlabsRepository;
    private readonly subTaxesRepository;
    constructor(taxSlabsRepository: Repository<TaxSlab>, subTaxesRepository: Repository<SubTax>);
    createTaxSlab(dto: CreateTaxSlabDto): Promise<TaxSlab>;
    findAllTaxSlabs(): Promise<TaxSlab[]>;
    findOneTaxSlab(id: number): Promise<TaxSlab>;
    updateTaxSlab(id: number, dto: UpdateTaxSlabDto): Promise<TaxSlab>;
    removeTaxSlab(id: number): Promise<void>;
    createSubTax(slabId: number, dto: CreateSubTaxDto): Promise<SubTax>;
    findSubTaxesBySlab(slabId: number): Promise<SubTax[]>;
    findAllSubTaxes(): Promise<SubTax[]>;
    findOneSubTax(slabId: number, id: number): Promise<SubTax>;
    updateSubTax(slabId: number, id: number, dto: UpdateSubTaxDto): Promise<SubTax>;
    removeSubTax(slabId: number, id: number): Promise<void>;
    findApplicableTaxSlab(salary: number): Promise<TaxSlab | null>;
    calculateTaxes(grossSalary: number): Promise<TaxCalculationResult>;
    migrateOrphanSubTaxes(): Promise<void>;
    private calculateSubTaxAmount;
    private validateSalaryRange;
    private validateSubTaxPayload;
    private round;
}
