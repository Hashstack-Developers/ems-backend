import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppModule } from '../app.module';
import { EmployeesModule } from '../employees/employees.module';
import { Employee } from '../employees/entities/employee.entity';
import { GpFundModule } from '../gp-fund/gp-fund.module';
import { GpFundAdvance } from '../gp-fund/entities/gp-fund-advance.entity';
import { PayrollsModule } from '../payrolls/payrolls.module';
import { TaxSlab } from '../tax-slabs/entities/tax-slab.entity';
import { TaxSlabsModule } from '../tax-slabs/tax-slabs.module';
import { DemoSeedService } from './demo-seed.service';

@Module({
  imports: [
    AppModule,
    EmployeesModule,
    TaxSlabsModule,
    PayrollsModule,
    GpFundModule,
    TypeOrmModule.forFeature([Employee, GpFundAdvance, TaxSlab]),
  ],
  providers: [DemoSeedService],
})
export class SeedModule {}
