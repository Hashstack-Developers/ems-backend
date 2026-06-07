import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SubTax } from './entities/sub-tax.entity';
import { TaxSlab } from './entities/tax-slab.entity';
import { TaxSlabsService } from './tax-slabs.service';
export declare class TaxSlabsSeedService implements OnModuleInit {
    private readonly taxSlabsRepository;
    private readonly subTaxesRepository;
    private readonly taxSlabsService;
    private readonly logger;
    constructor(taxSlabsRepository: Repository<TaxSlab>, subTaxesRepository: Repository<SubTax>, taxSlabsService: TaxSlabsService);
    onModuleInit(): Promise<void>;
    private seedTaxSlabs;
    private seedSubTaxesPerSlab;
}
