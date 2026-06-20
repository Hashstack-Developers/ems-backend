import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollDeduction } from '../payrolls/entities/payroll-deduction.entity';
import { Payroll } from '../payrolls/entities/payroll.entity';
import { SubTax } from './entities/sub-tax.entity';
import { TaxSlab } from './entities/tax-slab.entity';
import { TaxOverviewService } from './tax-overview.service';
import { TaxSlabsController } from './tax-slabs.controller';
import { TaxSlabsService } from './tax-slabs.service';

@Module({
  imports: [TypeOrmModule.forFeature([TaxSlab, SubTax, Payroll, PayrollDeduction])],
  controllers: [TaxSlabsController],
  providers: [TaxSlabsService, TaxOverviewService],
  exports: [TaxSlabsService, TaxOverviewService],
})
export class TaxSlabsModule {}
