import {
  ConflictException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeesService } from '../employees/employees.service';
import { Employee } from '../employees/entities/employee.entity';
import { GpFundService } from '../gp-fund/gp-fund.service';
import { PayrollsService } from '../payrolls/payrolls.service';
import {
  DEMO_EMPLOYEES,
  DEMO_GP_FUND_YEARS,
  DEMO_MARKER_CODE,
  DEMO_PAYROLL_YEARS,
} from './demo-employees.data';

@Injectable()
export class DemoDataSeedService implements OnModuleInit {
  private readonly logger = new Logger(DemoDataSeedService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly employeesService: EmployeesService,
    private readonly payrollsService: PayrollsService,
    private readonly gpFundService: GpFundService,
    @InjectRepository(Employee)
    private readonly employeesRepository: Repository<Employee>,
  ) {}

  async onModuleInit() {
    if (this.configService.get<string>('SEED_DEMO_DATA') === 'true') {
      await this.seed();
    }
  }

  async seed(): Promise<void> {
    this.logger.log('Starting demo data seed...');

    const employeesAdded = await this.seedEmployees();
    const { created: payrollsCreated, skipped: payrollsSkipped } =
      await this.seedPayrolls();
    const gpFundAdded = await this.seedGpFund();

    this.logger.log(
      `Demo seed complete — employees: +${employeesAdded}, payrolls: +${payrollsCreated} (skipped ${payrollsSkipped}), GP Fund years: +${gpFundAdded}`,
    );
  }

  private async seedEmployees(): Promise<number> {
    const marker = await this.employeesRepository.findOne({
      where: { employeeCode: DEMO_MARKER_CODE },
    });

    if (marker) {
      this.logger.log('Demo employees already exist — skipping employee insert');
      return 0;
    }

    let added = 0;
    for (const dto of DEMO_EMPLOYEES) {
      await this.employeesService.create(dto);
      added++;
    }

    this.logger.log(`Created ${added} demo employees`);
    return added;
  }

  private async seedPayrolls(): Promise<{ created: number; skipped: number }> {
    const activeEmployees = await this.employeesService.findActiveEmployees();
    let created = 0;
    let skipped = 0;

    for (const year of DEMO_PAYROLL_YEARS) {
      for (let month = 1; month <= 12; month++) {
        for (const employee of activeEmployees) {
          try {
            await this.payrollsService.generate({
              month,
              year,
              employeeId: employee.id,
            });
            created++;
          } catch (error) {
            if (error instanceof ConflictException) {
              skipped++;
              continue;
            }
            throw error;
          }
        }
      }
    }

    this.logger.log(
      `Payrolls seeded for ${DEMO_PAYROLL_YEARS.join(', ')} — created ${created}, skipped ${skipped} existing`,
    );

    return { created, skipped };
  }

  private async seedGpFund(): Promise<number> {
    let added = 0;

    for (const year of DEMO_GP_FUND_YEARS) {
      const existing = await this.gpFundService.findByYear(year);
      if (existing) {
        continue;
      }

      const { suggestedAmount } =
        await this.gpFundService.getSuggestedTaxCollection(year);

      const markupRate = 8;
      const markupTaxAmount =
        Math.round(suggestedAmount * (markupRate / 100) * 100) / 100;

      await this.gpFundService.create({
        year,
        yearlyTaxCollection: suggestedAmount,
        markupRate,
        markupTaxAmount,
      });

      added++;
      this.logger.log(
        `GP Fund ${year}: collection PKR ${suggestedAmount}, markup ${markupRate}%`,
      );
    }

    return added;
  }
}
