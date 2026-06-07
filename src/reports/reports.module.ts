import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module';
import { PayrollsModule } from '../payrolls/payrolls.module';
import { TaxSlabsModule } from '../tax-slabs/tax-slabs.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [EmployeesModule, PayrollsModule, TaxSlabsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
