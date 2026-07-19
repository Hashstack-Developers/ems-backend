import { roundAmount, formatAmount } from '../common/utils/currency.utils';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeesService } from '../employees/employees.service';
import { computePayrollGross, getEmployeeFullName } from '../employees/employee.utils';
import { Employee, EmployeeStatus } from '../employees/entities/employee.entity';
import { GP_FUND_ANNUAL_MARKUP_CODE, GP_FUND_ADVANCE_CODE, GP_FUND_DEDUCTION_CODE } from '../gp-fund/gp-fund.utils';
import { GpFundAdvanceService } from '../gp-fund/gp-fund-advance.service';
import { GpFundService } from '../gp-fund/gp-fund.service';
import { MailService } from '../mail/mail.service';
import { AllowanceSettingsService } from '../allowances/allowance-settings.service';
import { TaxSlabsService } from '../tax-slabs/tax-slabs.service';
import { GeneratePayrollDto } from './dto/generate-payroll.dto';
import {
  DeductionCalculationType,
  DeductionCategory,
  PayrollDeduction,
} from './entities/payroll-deduction.entity';
import { SubTaxType } from '../tax-slabs/entities/sub-tax.entity';
import { Payroll, PayrollStatus } from './entities/payroll.entity';
import { SalarySlipsService } from './salary-slips.service';
import { PensionEnrollmentService } from '../pension/pension-enrollment.service';
import { PensionSettingsService } from '../pension/pension-settings.service';
import { PENSION_DEDUCTION_CODE, PENSION_EMPLOYER_DEDUCTION_CODE } from '../pension/pension.utils';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface PayrollGenerationSkip {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  reason: string;
}

export interface PayrollGenerationError {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  message: string;
}

export interface PayrollGenerationResult {
  created: Payroll[];
  skipped: PayrollGenerationSkip[];
  errors: PayrollGenerationError[];
  summary: {
    totalEligible: number;
    createdCount: number;
    skippedCount: number;
    errorCount: number;
  };
}

export interface PayrollGenerationStatus {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  department: string;
  designation: string;
  hasPayroll: boolean;
  payrollId: number | null;
  payrollStatus: PayrollStatus | null;
  canGenerate: boolean;
  message: string;
}

@Injectable()
export class PayrollsService {
  private readonly logger = new Logger(PayrollsService.name);

  constructor(
    @InjectRepository(Payroll)
    private readonly payrollsRepository: Repository<Payroll>,
    @InjectRepository(PayrollDeduction)
    private readonly deductionsRepository: Repository<PayrollDeduction>,
    private readonly employeesService: EmployeesService,
    private readonly taxSlabsService: TaxSlabsService,
    private readonly gpFundService: GpFundService,
    private readonly gpFundAdvanceService: GpFundAdvanceService,
    private readonly salarySlipsService: SalarySlipsService,
    private readonly mailService: MailService,
    private readonly allowanceSettingsService: AllowanceSettingsService,
    private readonly pensionEnrollmentService: PensionEnrollmentService,
    private readonly pensionSettingsService: PensionSettingsService,
  ) {}

  async generate(dto: GeneratePayrollDto): Promise<PayrollGenerationResult> {
    this.validatePeriod(dto.month, dto.year);

    const employees = dto.employeeId
      ? [await this.employeesService.findOne(dto.employeeId)]
      : await this.employeesService.findActiveEmployees();

    if (employees.length === 0) {
      throw new BadRequestException('No active employees found for payroll generation');
    }

    if (dto.employeeId && employees[0].status !== EmployeeStatus.ACTIVE) {
      throw new BadRequestException('Cannot generate payroll for an inactive employee');
    }

    const result: PayrollGenerationResult = {
      created: [],
      skipped: [],
      errors: [],
      summary: {
        totalEligible: employees.length,
        createdCount: 0,
        skippedCount: 0,
        errorCount: 0,
      },
    };

    for (const employee of employees) {
      try {
        if (employee.payrollOnHold) {
          result.skipped.push({
            employeeId: employee.id,
            employeeCode: employee.employeeCode,
            fullName: getEmployeeFullName(employee),
            reason: 'Payroll on hold',
          });
          continue;
        }

        if (employee.payrollHeldFrom) {
          const catchUpPayrolls = await this.catchUpHeldPayrolls(employee, dto.month, dto.year);
          result.created.push(...catchUpPayrolls);
          await this.employeesService.clearPayrollHeldFrom(employee.id);
          continue;
        }

        const outcome = await this.tryGenerateForEmployee(
          employee,
          dto.month,
          dto.year,
        );

        if (outcome.type === 'created') {
          result.created.push(outcome.payroll);
          continue;
        }

        result.skipped.push({
          employeeId: employee.id,
          employeeCode: employee.employeeCode,
          fullName: getEmployeeFullName(employee),
          reason: outcome.reason,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Payroll generation failed';

        result.errors.push({
          employeeId: employee.id,
          employeeCode: employee.employeeCode,
          fullName: getEmployeeFullName(employee),
          message,
        });

        if (dto.employeeId) {
          throw error;
        }
      }
    }

    result.summary = {
      totalEligible: employees.length,
      createdCount: result.created.length,
      skippedCount: result.skipped.length,
      errorCount: result.errors.length,
    };

    this.sendPayrollEmails(result.created, dto.month, dto.year);

    return result;
  }

  private sendPayrollEmails(payrolls: Payroll[], month: number, year: number): void {
    if (!this.mailService.isEnabled()) {
      this.logger.warn('[MAIL] Email sending skipped — mail service not enabled');
      return;
    }
    if (payrolls.length === 0) return;
    this.logger.log(`[MAIL] Queuing salary slip emails for ${payrolls.length} payroll(s)`);

    const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;

    void Promise.allSettled(
      payrolls.map(async (payroll) => {
        const employeeEmail = payroll.employee?.email;
        if (!employeeEmail) return;

        try {
          const { buffer, filename } = await this.salarySlipsService.generatePdf(payroll.id);
          await this.mailService.sendSalarySlip({
            to: employeeEmail,
            employeeName: payroll.employee.name,
            employeeCode: payroll.employee.employeeCode,
            monthLabel,
            grossSalary: `Rs. ${formatAmount(payroll.grossSalary)}`,
            totalDeductions: `Rs. ${formatAmount(payroll.totalDeductions)}`,
            netSalary: `Rs. ${formatAmount(payroll.netSalary)}`,
            pdfBuffer: buffer,
            filename,
          });
          this.logger.log(`Salary slip email sent to ${employeeEmail} (${payroll.employee.employeeCode}) for ${monthLabel}`);
        } catch (err) {
          this.logger.error(
            `Failed to send salary slip email to ${employeeEmail} (${payroll.employee?.employeeCode}): ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }),
    );
  }

  async getGenerationStatus(
    month: number,
    year: number,
  ): Promise<PayrollGenerationStatus[]> {
    this.validatePeriod(month, year);

    const [employees, payrolls] = await Promise.all([
      this.employeesService.findActiveEmployees(),
      this.payrollsRepository.find({
        where: { month, year },
      }),
    ]);

    const payrollByEmployee = new Map(
      payrolls.map((payroll) => [payroll.employeeId, payroll]),
    );

    return employees.map((employee) => {
      const payroll = payrollByEmployee.get(employee.id);
      const hasPayroll = !!payroll;

      let message = 'Payroll not generated for this period';
      if (hasPayroll) {
        message = 'Payroll already exists for this period';
      }

      return {
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        fullName: getEmployeeFullName(employee),
        department: employee.stage ?? '',
        designation: employee.designation,
        hasPayroll,
        payrollId: payroll?.id ?? null,
        payrollStatus: payroll?.status ?? null,
        canGenerate: !hasPayroll,
        message,
      };
    });
  }

  async findAll(month?: number, year?: number): Promise<Payroll[]> {
    const query = this.payrollsRepository
      .createQueryBuilder('payroll')
      .leftJoinAndSelect('payroll.employee', 'employee')
      .leftJoinAndSelect('payroll.deductions', 'deductions')
      .orderBy('payroll.year', 'DESC')
      .addOrderBy('payroll.month', 'DESC');

    if (month) {
      query.andWhere('payroll.month = :month', { month });
    }
    if (year) {
      query.andWhere('payroll.year = :year', { year });
    }

    return query.getMany();
  }

  async findOne(id: number): Promise<Payroll> {
    const payroll = await this.payrollsRepository.findOne({
      where: { id },
      relations: { employee: true, deductions: true },
    });
    if (!payroll) {
      throw new NotFoundException(`Payroll with ID ${id} not found`);
    }
    return payroll;
  }

  async remove(id: number): Promise<void> {
    const payroll = await this.findOne(id);
    await this.gpFundAdvanceService.revertPaymentForPayroll(payroll.id);
    await this.payrollsRepository.remove(payroll);
  }

  async getSummary(month?: number, year?: number) {
    const payrolls = await this.findAll(month, year);
    const totalGross = payrolls.reduce(
      (sum, p) => sum + Number(p.grossSalary),
      0,
    );
    const totalDeductions = payrolls.reduce(
      (sum, p) => sum + Number(p.totalDeductions),
      0,
    );
    const totalNet = payrolls.reduce((sum, p) => sum + Number(p.netSalary), 0);

    return {
      count: payrolls.length,
      totalGross: roundAmount(totalGross),
      totalDeductions: roundAmount(totalDeductions),
      totalNet: roundAmount(totalNet),
    };
  }

  async getMonthlySummaries() {
    const rows = await this.payrollsRepository
      .createQueryBuilder('p')
      .select('p.year', 'year')
      .addSelect('p.month', 'month')
      .addSelect('COUNT(p.id)', 'count')
      .addSelect('SUM(p.gross_salary)', 'totalGross')
      .addSelect('SUM(p.total_deductions)', 'totalDeductions')
      .addSelect('SUM(p.net_salary)', 'totalNet')
      .groupBy('p.year')
      .addGroupBy('p.month')
      .orderBy('p.year', 'DESC')
      .addOrderBy('p.month', 'DESC')
      .getRawMany<{
        year: string;
        month: string;
        count: string;
        totalGross: string;
        totalDeductions: string;
        totalNet: string;
      }>();

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    return rows.map((row) => {
      const month = parseInt(row.month, 10);
      const year = parseInt(row.year, 10);
      return {
        month,
        year,
        label: `${monthNames[month - 1]} ${year}`,
        count: parseInt(row.count, 10),
        totalGross: roundAmount(Number(row.totalGross)),
        totalDeductions: roundAmount(Number(row.totalDeductions)),
        totalNet: roundAmount(Number(row.totalNet)),
      };
    });
  }

  buildGenerationMessage(
    result: PayrollGenerationResult,
    singleEmployee: boolean,
  ): string {
    const { createdCount, skippedCount, errorCount } = result.summary;

    if (singleEmployee) {
      if (createdCount === 1) {
        return 'Payroll generated successfully';
      }
      if (skippedCount === 1) {
        return result.skipped[0]?.reason ?? 'Payroll already exists for this period';
      }
      if (errorCount === 1) {
        return result.errors[0]?.message ?? 'Payroll generation failed';
      }
    }

    if (createdCount === 0 && skippedCount > 0 && errorCount === 0) {
      return `All ${skippedCount} employee(s) already have payroll for this period`;
    }

    if (createdCount > 0 && skippedCount > 0) {
      return `Generated ${createdCount} payroll(s), skipped ${skippedCount} existing`;
    }

    if (createdCount > 0 && errorCount > 0) {
      return `Generated ${createdCount} payroll(s), ${errorCount} failed`;
    }

    if (createdCount > 0) {
      return `Generated ${createdCount} payroll record(s)`;
    }

    if (errorCount > 0) {
      return `Payroll generation failed for ${errorCount} employee(s)`;
    }

    return 'No payroll records were generated';
  }

  private async tryGenerateForEmployee(
    employee: Employee,
    month: number,
    year: number,
  ): Promise<
    | { type: 'created'; payroll: Payroll }
    | { type: 'skipped'; reason: string }
  > {
    const existing = await this.payrollsRepository.findOne({
      where: { employeeId: employee.id, month, year },
    });

    if (existing) {
      return {
        type: 'skipped',
        reason: `Payroll already exists for ${getEmployeeFullName(employee)} for ${month}/${year}`,
      };
    }

    const payroll = await this.createPayrollForEmployee(employee, month, year);
    return { type: 'created', payroll };
  }

  private async createPayrollForEmployee(
    employee: Employee,
    month: number,
    year: number,
  ): Promise<Payroll> {
    const { fullGross, payableGross, salaryDays } = computePayrollGross(employee);
    const taxResult = await this.taxSlabsService.calculateTaxes(payableGross);
    const scaleMap = await this.gpFundService.getScaleValueMap();
    const markupSettings = await this.gpFundService.getMarkupSettings();
    const markupRates = this.gpFundService.getMarkupRatesFromSettings(markupSettings);
    const gpFund = await this.gpFundService.resolveGpFundWithMarkupForPayroll(
      employee,
      scaleMap,
      markupRates,
      month,
      year,
    );
    const advanceInstallment = await this.gpFundAdvanceService.resolveInstallmentForPayroll(
      employee.id,
    );
    const totalGpFundDeductions = roundAmount(
      gpFund.totalAmount + (advanceInstallment?.amount ?? 0),
    );

    const allowanceSettings = await this.allowanceSettingsService.getSettings();
    const { welfareRate, managementRate } = this.allowanceSettingsService.resolveRates(
      allowanceSettings,
      employee.welfareAllowance,
      employee.managementAllowance,
    );
    const basicPayForAllowance = Number(employee.basicPayDec2025 ?? 0);
    const { welfareAmount, managementAmount } = this.allowanceSettingsService.computeAmounts(
      basicPayForAllowance,
      welfareRate,
      managementRate,
    );

    const pensionEnrollment = await this.pensionEnrollmentService.getActiveEnrollment(employee.id);
    const pensionSettings = await this.pensionSettingsService.getSettings();
    const basicPayForPension = Number(employee.basicPayDec2025 ?? 0);
    const employeeRate = pensionEnrollment ? Number(pensionSettings.employeeRate) : 0;
    const employerRate = pensionEnrollment ? Number(pensionSettings.employerRate) : 0;
    const pensionAmount = pensionEnrollment && employeeRate > 0
      ? this.pensionSettingsService.computePensionAmount(basicPayForPension, employeeRate)
      : 0;
    const pensionEmployerAmount = pensionEnrollment && employerRate > 0
      ? this.pensionSettingsService.computePensionAmount(basicPayForPension, employerRate)
      : 0;

    const totalDeductions = roundAmount(taxResult.totalDeductions + totalGpFundDeductions + pensionAmount);

    const netSalary = roundAmount(payableGross - totalDeductions);

    const payroll = this.payrollsRepository.create({
      employeeId: employee.id,
      month,
      year,
      basicSalary: roundAmount(fullGross),
      grossSalary: roundAmount(payableGross),
      salaryDays,
      incomeTax: roundAmount(taxResult.incomeTax),
      totalDeductions,
      netSalary,
      welfareAllowanceAmount: welfareAmount,
      managementAllowanceAmount: managementAmount,
      pensionAmount,
      pensionEmployerAmount,
      taxSlabId: taxResult.taxSlab?.id ?? null,
      taxSlabName: taxResult.taxSlab?.name ?? 'No applicable slab',
      appliedTaxRate: taxResult.taxSlab?.taxRate != null
        ? Number(taxResult.taxSlab.taxRate)
        : null,
      taxSlabMinSalary: taxResult.taxSlab
        ? Number(taxResult.taxSlab.minSalary)
        : null,
      taxSlabMaxSalary: taxResult.taxSlab?.maxSalary
        ? Number(taxResult.taxSlab.maxSalary)
        : null,
      status: PayrollStatus.PROCESSED,
    });

    const savedPayroll = await this.payrollsRepository.save(payroll);

    const deductions: Partial<PayrollDeduction>[] = [];

    if (taxResult.incomeTax > 0 && taxResult.taxSlab) {
      const { percentageMonthly, fixedMonthly } = taxResult.incomeTaxBreakdown;

      if (percentageMonthly > 0) {
        deductions.push({
          payrollId: savedPayroll.id,
          name: 'Income Tax (Percentage)',
          code: 'INCOME_TAX',
          category: DeductionCategory.INCOME_TAX,
          amount: percentageMonthly,
          calculationType: DeductionCalculationType.PERCENTAGE,
          appliedRate: Number(taxResult.taxSlab.taxRate),
          appliedFixedAmount: null,
          sourceSubTaxId: null,
        });
      }

      if (fixedMonthly > 0) {
        deductions.push({
          payrollId: savedPayroll.id,
          name: 'Income Tax (Fixed)',
          code: 'INCOME_TAX_FIXED',
          category: DeductionCategory.INCOME_TAX,
          amount: fixedMonthly,
          calculationType: DeductionCalculationType.FIXED,
          appliedRate: null,
          appliedFixedAmount: Number(taxResult.taxSlab.fixedTaxAmount),
          sourceSubTaxId: null,
        });
      }
    }

    for (const item of taxResult.subTaxDeductions) {
      const isPercentage = item.subTax.type === SubTaxType.PERCENTAGE;
      deductions.push({
        payrollId: savedPayroll.id,
        name: item.subTax.name,
        code: item.subTax.code,
        category: DeductionCategory.SUB_TAX,
        amount: item.amount,
        calculationType: isPercentage
          ? DeductionCalculationType.PERCENTAGE
          : DeductionCalculationType.FIXED,
        appliedRate: isPercentage ? Number(item.subTax.rate) : null,
        appliedFixedAmount: isPercentage ? null : Number(item.subTax.amount),
        sourceSubTaxId: item.subTax.id,
      });
    }

    if (gpFund.baseAmount > 0 && gpFund.scaleCode) {
      deductions.push({
        payrollId: savedPayroll.id,
        name: `GP Fund (${gpFund.scaleCode})`,
        code: GP_FUND_DEDUCTION_CODE,
        category: DeductionCategory.GP_FUND,
        amount: gpFund.baseAmount,
        calculationType: DeductionCalculationType.FIXED,
        appliedRate: null,
        appliedFixedAmount: gpFund.subscriptionValue,
        sourceSubTaxId: null,
      });
    }

    if (gpFund.annualMarkupAmount > 0 && gpFund.scaleCode) {
      deductions.push({
        payrollId: savedPayroll.id,
        name: `GP Fund Annual Markup (${markupRates.annualMarkupRate}%)`,
        code: GP_FUND_ANNUAL_MARKUP_CODE,
        category: DeductionCategory.GP_FUND,
        amount: gpFund.annualMarkupAmount,
        calculationType: DeductionCalculationType.PERCENTAGE,
        appliedRate: markupRates.annualMarkupRate,
        appliedFixedAmount: null,
        sourceSubTaxId: null,
      });
    }

    if (advanceInstallment && advanceInstallment.amount > 0) {
      deductions.push({
        payrollId: savedPayroll.id,
        name: `GP Fund Advance Installment (${advanceInstallment.installmentNumber}/${advanceInstallment.installmentMonths})`,
        code: GP_FUND_ADVANCE_CODE,
        category: DeductionCategory.GP_FUND,
        amount: advanceInstallment.amount,
        calculationType: DeductionCalculationType.FIXED,
        appliedRate: null,
        appliedFixedAmount: advanceInstallment.monthlyInstallment,
        sourceSubTaxId: null,
      });
    }

    if (pensionAmount > 0 && pensionEnrollment) {
      deductions.push({
        payrollId: savedPayroll.id,
        name: 'Pension (Employee)',
        code: PENSION_DEDUCTION_CODE,
        category: DeductionCategory.PENSION,
        amount: pensionAmount,
        calculationType: DeductionCalculationType.PERCENTAGE,
        appliedRate: employeeRate,
        appliedFixedAmount: null,
        sourceSubTaxId: null,
      });
    }

    if (pensionEmployerAmount > 0 && pensionEnrollment) {
      deductions.push({
        payrollId: savedPayroll.id,
        name: 'Pension (Employer)',
        code: PENSION_EMPLOYER_DEDUCTION_CODE,
        category: DeductionCategory.PENSION,
        amount: pensionEmployerAmount,
        calculationType: DeductionCalculationType.PERCENTAGE,
        appliedRate: employerRate,
        appliedFixedAmount: null,
        sourceSubTaxId: null,
      });
    }

    if (deductions.length > 0) {
      await this.deductionsRepository.save(deductions);
    }

    if (advanceInstallment && advanceInstallment.amount > 0) {
      await this.gpFundAdvanceService.recordPayrollInstallment(
        advanceInstallment.advanceId,
        savedPayroll.id,
        advanceInstallment.amount,
        month,
        year,
      );
    }

    return this.findOne(savedPayroll.id);
  }

  private async catchUpHeldPayrolls(
    employee: Employee,
    currentMonth: number,
    currentYear: number,
  ): Promise<Payroll[]> {
    const heldFrom = new Date(employee.payrollHeldFrom!);
    let m = heldFrom.getUTCMonth() + 1;
    let y = heldFrom.getUTCFullYear();
    const created: Payroll[] = [];

    while (y < currentYear || (y === currentYear && m <= currentMonth)) {
      const outcome = await this.tryGenerateForEmployee(employee, m, y);
      if (outcome.type === 'created') {
        created.push(outcome.payroll);
      }
      m++;
      if (m > 12) { m = 1; y++; }
    }

    return created;
  }

  async getEmployeeHolds(): Promise<
    { id: number; employeeCode: string; name: string; designation: string; payrollOnHold: boolean; payrollHeldFrom: Date | null }[]
  > {
    return this.employeesService.findActiveEmployeesWithHoldStatus() as Promise<any>;
  }

  private validatePeriod(month: number, year: number): void {
    if (month < 1 || month > 12) {
      throw new BadRequestException('Month must be between 1 and 12');
    }
    if (year < 2000 || year > 2100) {
      throw new BadRequestException('Year must be between 2000 and 2100');
    }
  }
}
