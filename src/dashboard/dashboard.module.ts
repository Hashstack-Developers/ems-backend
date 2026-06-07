import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module';
import { PayrollsModule } from '../payrolls/payrolls.module';
import { TaxSlabsModule } from '../tax-slabs/tax-slabs.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [EmployeesModule, PayrollsModule, TaxSlabsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
