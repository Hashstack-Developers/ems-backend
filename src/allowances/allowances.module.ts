import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllowanceSettings } from './entities/allowance-settings.entity';
import { Payroll } from '../payrolls/entities/payroll.entity';
import { AllowanceSettingsService } from './allowance-settings.service';
import { AllowanceOverviewService } from './allowance-overview.service';
import { AllowancesController } from './allowances.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AllowanceSettings, Payroll])],
  providers: [AllowanceSettingsService, AllowanceOverviewService],
  controllers: [AllowancesController],
  exports: [AllowanceSettingsService],
})
export class AllowancesModule {}
