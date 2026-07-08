import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { EmployeesService } from '../employees/employees.service';
import { Employee } from '../employees/entities/employee.entity';
import { GpFundAdvanceService } from '../gp-fund/gp-fund-advance.service';
import { GpFundAdvance } from '../gp-fund/entities/gp-fund-advance.entity';
import { GpFundService } from '../gp-fund/gp-fund.service';
import { PayrollsService } from '../payrolls/payrolls.service';
import { TaxSlab } from '../tax-slabs/entities/tax-slab.entity';
import { TaxSlabsService } from '../tax-slabs/tax-slabs.service';
import {
  DEMO_ANNUAL_MARKUP_RATE,
  DEMO_EMAIL_DOMAIN,
  DEMO_GP_FUND_SCALE_VALUES,
  DEMO_PAYROLL_END,
  DEMO_PAYROLL_START,
} from './demo-seed.constants';
import {
  DEMO_ADVANCE_FIXTURES,
  DEMO_EMPLOYEE_FIXTURES,
  DemoEmployeeProfile,
} from './fixtures/demo-employees.fixture';
import { DEMO_TAX_SLAB_FIXTURES } from './fixtures/demo-tax-slabs.fixture';

export interface DemoSeedOptions {
  fresh: boolean;
}

export interface DemoSeedResult {
  employeesCreated: number;
  employeesSkipped: number;
  advancesCreated: number;
  payrollsCreated: number;
  payrollsSkipped: number;
  payrollErrors: number;
  taxSlabsCreated: number;
}

@Injectable()
export class DemoSeedService {
  private readonly logger = new Logger(DemoSeedService.name);

  constructor(
    private readonly employeesService: EmployeesService,
    private readonly taxSlabsService: TaxSlabsService,
    private readonly gpFundService: GpFundService,
    private readonly gpFundAdvanceService: GpFundAdvanceService,
    private readonly payrollsService: PayrollsService,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(GpFundAdvance)
    private readonly advanceRepository: Repository<GpFundAdvance>,
    @InjectRepository(TaxSlab)
    private readonly taxSlabRepository: Repository<TaxSlab>,
  ) {}

  async run(options: DemoSeedOptions): Promise<DemoSeedResult> {
    this.logger.log('Starting demo database seed...');

    if (options.fresh) {
      await this.cleanDemoData();
    }

    const taxSlabsCreated = await this.seedTaxSlabs();
    await this.seedGpFundConfig();

    const { created, skipped, byProfileKey } = await this.seedEmployees();
    const advancesCreated = await this.seedAdvances(byProfileKey);
    const payrollStats = await this.seedPayrolls(created);

    const result: DemoSeedResult = {
      employeesCreated: created.length,
      employeesSkipped: skipped,
      advancesCreated,
      payrollsCreated: payrollStats.created,
      payrollsSkipped: payrollStats.skipped,
      payrollErrors: payrollStats.errors,
      taxSlabsCreated,
    };

    this.logger.log('Demo seed completed.');
    this.logger.log(JSON.stringify(result, null, 2));
    return result;
  }

  private async cleanDemoData(): Promise<void> {
    this.logger.warn('Removing existing demo seed data...');

    const demoEmployees = await this.employeeRepository.find({
      where: { email: Like(`%${DEMO_EMAIL_DOMAIN}`) },
    });

    if (demoEmployees.length === 0) {
      this.logger.log('No demo employees found to remove.');
      return;
    }

    const employeeIds = demoEmployees.map((employee) => employee.id);
    await this.advanceRepository
      .createQueryBuilder()
      .delete()
      .where('employee_id IN (:...employeeIds)', { employeeIds })
      .execute();

    for (const employee of demoEmployees) {
      await this.employeesService.remove(employee.id);
    }

    this.logger.log(`Removed ${demoEmployees.length} demo employee(s) and related payrolls.`);
  }

  private async seedTaxSlabs(): Promise<number> {
    const existingCount = await this.taxSlabRepository.count();
    if (existingCount > 0) {
      this.logger.log(
        `Skipping tax slab seed — ${existingCount} slab(s) already exist. Payroll will use existing slabs.`,
      );
      return 0;
    }

    let created = 0;
    for (const fixture of DEMO_TAX_SLAB_FIXTURES) {
      const slab = await this.taxSlabsService.createTaxSlab({
        name: fixture.name,
        minSalary: fixture.minSalary,
        maxSalary: fixture.maxSalary,
        taxRate: fixture.taxRate,
        fixedTaxAmount: fixture.fixedTaxAmount ?? null,
        description: fixture.description,
        isActive: true,
      });

      for (const subTax of fixture.subTaxes ?? []) {
        await this.taxSlabsService.createSubTax(slab.id, subTax);
      }

      created += 1;
    }

    this.logger.log(`Created ${created} demo tax slab(s).`);
    return created;
  }

  private async seedGpFundConfig(): Promise<void> {
    const scales = await this.gpFundService.findAllScales();
    const scaleByCode = new Map(scales.map((scale) => [scale.code.toUpperCase(), scale]));

    for (const [code, value] of Object.entries(DEMO_GP_FUND_SCALE_VALUES)) {
      const scale = scaleByCode.get(code.toUpperCase());
      if (!scale) continue;

      if (Number(scale.value) === value) continue;

      await this.gpFundService.updateScale(scale.id, { value });
    }

    await this.gpFundService.updateMarkupSettings({
      annualMarkupRate: DEMO_ANNUAL_MARKUP_RATE,
    });

    this.logger.log('GP fund scale values and annual markup rate configured.');
  }

  private async seedEmployees(): Promise<{
    created: Employee[];
    skipped: number;
    byProfileKey: Map<string, Employee>;
  }> {
    const created: Employee[] = [];
    const byProfileKey = new Map<string, Employee>();
    let skipped = 0;

    for (const fixture of DEMO_EMPLOYEE_FIXTURES) {
      const existing = await this.employeeRepository.findOne({
        where: { email: fixture.email },
      });

      if (existing) {
        byProfileKey.set(fixture.profileKey, existing);
        skipped += 1;
        this.logger.log(`Employee already exists: ${fixture.email}`);
        continue;
      }

      const { profileKey, ...dto } = fixture;
      const employee = await this.employeesService.create(dto);
      created.push(employee);
      byProfileKey.set(profileKey, employee);
      this.logger.log(`Created employee: ${employee.name} (${employee.employeeCode})`);
    }

    return { created, skipped, byProfileKey };
  }

  private async seedAdvances(
    employeesByProfile: Map<string, Employee>,
  ): Promise<number> {
    let created = 0;

    for (const fixture of DEMO_ADVANCE_FIXTURES) {
      const employee = employeesByProfile.get(fixture.profileKey);
      if (!employee) {
        this.logger.warn(`Advance skipped — employee profile not found: ${fixture.profileKey}`);
        continue;
      }

      const existing = await this.gpFundAdvanceService.findActiveForEmployee(employee.id);
      if (existing) {
        this.logger.log(`Advance already active for ${employee.name}`);
        continue;
      }

      await this.gpFundAdvanceService.create({
        employeeId: employee.id,
        advanceAmount: fixture.advanceAmount,
        installmentMonths: fixture.installmentMonths,
        takenDate: fixture.takenDate,
        notes: fixture.notes,
      });

      created += 1;
      this.logger.log(`Created GP fund advance for ${employee.name}`);
    }

    return created;
  }

  private async seedPayrolls(employees: Employee[]): Promise<{
    created: number;
    skipped: number;
    errors: number;
  }> {
    const allDemoEmployees = await this.employeeRepository.find({
      where: { email: Like(`%${DEMO_EMAIL_DOMAIN}`) },
    });

    const targets = allDemoEmployees.length > 0 ? allDemoEmployees : employees;
    if (targets.length === 0) {
      this.logger.warn('No demo employees available for payroll generation.');
      return { created: 0, skipped: 0, errors: 0 };
    }

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const period of iteratePayrollPeriods(DEMO_PAYROLL_START, DEMO_PAYROLL_END)) {
      let periodCreated = 0;
      let periodSkipped = 0;
      let periodErrors = 0;

      for (const employee of targets) {
        const result = await this.payrollsService.generate({
          month: period.month,
          year: period.year,
          employeeId: employee.id,
        });

        periodCreated += result.summary.createdCount;
        periodSkipped += result.summary.skippedCount;
        periodErrors += result.summary.errorCount;
      }

      created += periodCreated;
      skipped += periodSkipped;
      errors += periodErrors;

      this.logger.log(
        `Payrolls ${formatPeriod(period.month, period.year)} — created ${periodCreated}, skipped ${periodSkipped}, errors ${periodErrors}`,
      );
    }

    return { created, skipped, errors };
  }
}

function* iteratePayrollPeriods(
  start: { month: number; year: number },
  end: { month: number; year: number },
): Generator<{ month: number; year: number }> {
  let month = start.month;
  let year = start.year;

  while (year < end.year || (year === end.year && month <= end.month)) {
    yield { month, year };
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
}

function formatPeriod(month: number, year: number): string {
  return `${month}/${year}`;
}
