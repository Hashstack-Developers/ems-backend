import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { Payroll } from '../payrolls/entities/payroll.entity';
import { GpFundRecord } from './entities/gp-fund-record.entity';
import { GpFundScale } from './entities/gp-fund-scale.entity';
import { GpFundController } from './gp-fund.controller';
import { GpFundOverviewService } from './gp-fund-overview.service';
import { GpFundService } from './gp-fund.service';

@Module({
  imports: [TypeOrmModule.forFeature([GpFundRecord, GpFundScale, Payroll, Employee])],
  controllers: [GpFundController],
  providers: [GpFundService, GpFundOverviewService],
  exports: [GpFundService, GpFundOverviewService],
})
export class GpFundModule {}
