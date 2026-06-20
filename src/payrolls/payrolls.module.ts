import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesModule } from '../employees/employees.module';
import { GpFundModule } from '../gp-fund/gp-fund.module';
import { TaxSlabsModule } from '../tax-slabs/tax-slabs.module';
import { PayrollDeduction } from './entities/payroll-deduction.entity';
import { Payroll } from './entities/payroll.entity';
import { PayrollsController } from './payrolls.controller';
import { PayrollsService } from './payrolls.service';
import { SalarySlipsController } from './salary-slips.controller';
import { SalarySlipsService } from './salary-slips.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payroll, PayrollDeduction]),
    EmployeesModule,
    TaxSlabsModule,
    GpFundModule,
  ],
  controllers: [PayrollsController, SalarySlipsController],
  providers: [PayrollsService, SalarySlipsService],
  exports: [PayrollsService, SalarySlipsService],
})
export class PayrollsModule {}
