import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PensionSettings } from './entities/pension-settings.entity';
import { PensionEnrollment } from './entities/pension-enrollment.entity';
import { Payroll } from '../payrolls/entities/payroll.entity';
import { PayrollDeduction } from '../payrolls/entities/payroll-deduction.entity';
import { Employee } from '../employees/entities/employee.entity';
import { PensionSettingsService } from './pension-settings.service';
import { PensionEnrollmentService } from './pension-enrollment.service';
import { PensionOverviewService } from './pension-overview.service';
import { PensionController } from './pension.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PensionSettings, PensionEnrollment, Payroll, PayrollDeduction, Employee])],
  providers: [PensionSettingsService, PensionEnrollmentService, PensionOverviewService],
  controllers: [PensionController],
  exports: [PensionSettingsService, PensionEnrollmentService],
})
export class PensionModule {}
