import { CreateSubTaxDto } from './dto/create-sub-tax.dto';
import { CreateTaxSlabDto } from './dto/create-tax-slab.dto';
import { UpdateSubTaxDto } from './dto/update-sub-tax.dto';
import { UpdateTaxSlabDto } from './dto/update-tax-slab.dto';
import { TaxSlabsService } from './tax-slabs.service';
export declare class TaxSlabsController {
    private readonly taxSlabsService;
    constructor(taxSlabsService: TaxSlabsService);
    createSubTax(slabId: number, dto: CreateSubTaxDto): Promise<{
        success: boolean;
        data: import("./entities/sub-tax.entity").SubTax;
    }>;
    findSubTaxesBySlab(slabId: number): Promise<{
        success: boolean;
        data: import("./entities/sub-tax.entity").SubTax[];
    }>;
    findOneSubTax(slabId: number, id: number): Promise<{
        success: boolean;
        data: import("./entities/sub-tax.entity").SubTax;
    }>;
    updateSubTax(slabId: number, id: number, dto: UpdateSubTaxDto): Promise<{
        success: boolean;
        data: import("./entities/sub-tax.entity").SubTax;
    }>;
    removeSubTax(slabId: number, id: number): Promise<{
        success: boolean;
        message: string;
    }>;
    createTaxSlab(dto: CreateTaxSlabDto): Promise<{
        success: boolean;
        data: import("./entities/tax-slab.entity").TaxSlab;
    }>;
    findAllTaxSlabs(): Promise<{
        success: boolean;
        data: import("./entities/tax-slab.entity").TaxSlab[];
    }>;
    findOneTaxSlab(id: number): Promise<{
        success: boolean;
        data: import("./entities/tax-slab.entity").TaxSlab;
    }>;
    updateTaxSlab(id: number, dto: UpdateTaxSlabDto): Promise<{
        success: boolean;
        data: import("./entities/tax-slab.entity").TaxSlab;
    }>;
    removeTaxSlab(id: number): Promise<{
        success: boolean;
        message: string;
    }>;
}
