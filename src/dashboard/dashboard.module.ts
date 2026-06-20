import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module';
import { GpFundModule } from '../gp-fund/gp-fund.module';
import { PayrollsModule } from '../payrolls/payrolls.module';
import { TaxSlabsModule } from '../tax-slabs/tax-slabs.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [EmployeesModule, PayrollsModule, TaxSlabsModule, GpFundModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
