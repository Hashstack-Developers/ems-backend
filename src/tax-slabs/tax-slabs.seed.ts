import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubTax, SubTaxType } from './entities/sub-tax.entity';
import { TaxSlab } from './entities/tax-slab.entity';
import { TaxSlabsService } from './tax-slabs.service';

@Injectable()
export class TaxSlabsSeedService implements OnModuleInit {
  private readonly logger = new Logger(TaxSlabsSeedService.name);

  constructor(
    @InjectRepository(TaxSlab)
    private readonly taxSlabsRepository: Repository<TaxSlab>,
    @InjectRepository(SubTax)
    private readonly subTaxesRepository: Repository<SubTax>,
    private readonly taxSlabsService: TaxSlabsService,
  ) {}

  async onModuleInit() {
    await this.seedTaxSlabs();
    await this.taxSlabsService.migrateOrphanSubTaxes();
    await this.seedSubTaxesPerSlab();
  }

  private async seedTaxSlabs() {
    const count = await this.taxSlabsRepository.count();
    if (count > 0) {
      return;
    }

    const slabs: Partial<TaxSlab>[] = [
      {
        name: 'Exempt',
        minSalary: 0,
        maxSalary: 50000,
        taxRate: 0,
        description: 'No income tax for salaries up to 50,000',
      },
      {
        name: 'Slab A',
        minSalary: 50001,
        maxSalary: 100000,
        taxRate: 5,
        description: '5% tax for salaries between 50,001 and 100,000',
      },
      {
        name: 'Slab B',
        minSalary: 100001,
        maxSalary: 200000,
        taxRate: 10,
        description: '10% tax for salaries between 100,001 and 200,000',
      },
      {
        name: 'Slab C',
        minSalary: 200001,
        maxSalary: null,
        taxRate: 15,
        description: '15% tax for salaries above 200,000',
      },
    ];

    await this.taxSlabsRepository.save(slabs);
    this.logger.log('Default tax slabs seeded');
  }

  private async seedSubTaxesPerSlab() {
    const slabs = await this.taxSlabsRepository.find({ order: { minSalary: 'ASC' } });
    if (slabs.length === 0) {
      return;
    }

    const subTaxCount = await this.subTaxesRepository.count();
    if (subTaxCount > 0) {
      return;
    }

    const slabMap = Object.fromEntries(slabs.map((s) => [s.name, s]));

    const perSlabConfig: Record<string, Partial<SubTax>[]> = {
      Exempt: [
        { name: 'Professional Tax', code: 'PT', type: SubTaxType.FIXED, amount: 100 },
      ],
      'Slab A': [
        { name: 'Employees Old-Age Benefits Institution', code: 'EOBI', type: SubTaxType.PERCENTAGE, rate: 0.5 },
        { name: 'Professional Tax', code: 'PT', type: SubTaxType.FIXED, amount: 150 },
      ],
      'Slab B': [
        { name: 'Employees Old-Age Benefits Institution', code: 'EOBI', type: SubTaxType.PERCENTAGE, rate: 1 },
        { name: 'Social Security', code: 'SS', type: SubTaxType.PERCENTAGE, rate: 0.5 },
        { name: 'Professional Tax', code: 'PT', type: SubTaxType.FIXED, amount: 200 },
      ],
      'Slab C': [
        { name: 'Employees Old-Age Benefits Institution', code: 'EOBI', type: SubTaxType.PERCENTAGE, rate: 1 },
        { name: 'Social Security', code: 'SS', type: SubTaxType.PERCENTAGE, rate: 1 },
        { name: 'Professional Tax', code: 'PT', type: SubTaxType.FIXED, amount: 300 },
      ],
    };

    for (const [slabName, subTaxes] of Object.entries(perSlabConfig)) {
      const slab = slabMap[slabName];
      if (!slab) continue;

      await this.subTaxesRepository.save(
        subTaxes.map((st) => ({
          ...st,
          taxSlabId: slab.id,
          isActive: true,
        })),
      );
    }

    this.logger.log('Per-slab sub-taxes seeded');
  }
}
