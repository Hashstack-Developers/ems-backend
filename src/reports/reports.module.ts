import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module';
import { GpFundModule } from '../gp-fund/gp-fund.module';
import { PayrollsModule } from '../payrolls/payrolls.module';
import { PensionModule } from '../pension/pension.module';
import { TaxSlabsModule } from '../tax-slabs/tax-slabs.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [EmployeesModule, PayrollsModule, TaxSlabsModule, GpFundModule, PensionModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
