import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { EmployeesModule } from '../employees/employees.module';
import { GpFundModule } from '../gp-fund/gp-fund.module';
import { PayrollsModule } from '../payrolls/payrolls.module';
import { DemoDataSeedService } from './demo-data.seed';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee]),
    EmployeesModule,
    PayrollsModule,
    GpFundModule,
  ],
  providers: [DemoDataSeedService],
  exports: [DemoDataSeedService],
})
export class SeedModule {}
