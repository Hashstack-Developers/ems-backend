import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payroll } from '../payrolls/entities/payroll.entity';
import { GpFundRecord } from './entities/gp-fund-record.entity';
import { GpFundController } from './gp-fund.controller';
import { GpFundService } from './gp-fund.service';

@Module({
  imports: [TypeOrmModule.forFeature([GpFundRecord, Payroll])],
  controllers: [GpFundController],
  providers: [GpFundService],
  exports: [GpFundService],
})
export class GpFundModule {}
