import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { Payroll } from '../payrolls/entities/payroll.entity';
import { GpFundRecord } from './entities/gp-fund-record.entity';
import { GpFundMarkupSettings } from './entities/gp-fund-markup-settings.entity';
import { GpFundScale } from './entities/gp-fund-scale.entity';
import { GpFundAdvancePayment } from './entities/gp-fund-advance-payment.entity';
import { GpFundAdvance } from './entities/gp-fund-advance.entity';
import { GpFundController } from './gp-fund.controller';
import { GpFundAdvanceService } from './gp-fund-advance.service';
import { GpFundOverviewService } from './gp-fund-overview.service';
import { GpFundService } from './gp-fund.service';

@Module({
  imports: [TypeOrmModule.forFeature([
    GpFundRecord,
    GpFundMarkupSettings,
    GpFundScale,
    GpFundAdvance,
    GpFundAdvancePayment,
    Payroll,
    Employee,
  ])],
  controllers: [GpFundController],
  providers: [GpFundService, GpFundAdvanceService, GpFundOverviewService],
  exports: [GpFundService, GpFundAdvanceService, GpFundOverviewService],
})
export class GpFundModule {}
