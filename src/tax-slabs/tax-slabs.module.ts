import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubTax } from './entities/sub-tax.entity';
import { TaxSlab } from './entities/tax-slab.entity';
import { TaxSlabsController } from './tax-slabs.controller';
import { TaxSlabsService } from './tax-slabs.service';
import { TaxSlabsSeedService } from './tax-slabs.seed';

@Module({
  imports: [TypeOrmModule.forFeature([TaxSlab, SubTax])],
  controllers: [TaxSlabsController],
  providers: [TaxSlabsService, TaxSlabsSeedService],
  exports: [TaxSlabsService],
})
export class TaxSlabsModule {}
