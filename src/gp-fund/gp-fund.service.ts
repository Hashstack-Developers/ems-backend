import { roundAmount } from '../common/utils/currency.utils';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NoChangesException } from '../common/exceptions/no-changes.exception';
import { isSameOptionalNumber } from '../common/utils/change-detection';
import { Employee } from '../employees/entities/employee.entity';
import { Payroll } from '../payrolls/entities/payroll.entity';
import { CreateGpFundScaleDto } from './dto/create-gp-fund-scale.dto';
import { CreateGpFundRecordDto } from './dto/create-gp-fund-record.dto';
import { UpdateGpFundScaleDto } from './dto/update-gp-fund-scale.dto';
import { UpdateGpFundRecordDto } from './dto/update-gp-fund-record.dto';
import { GpFundRecord } from './entities/gp-fund-record.entity';
import { GpFundMarkupSettings } from './entities/gp-fund-markup-settings.entity';
import { GpFundScale } from './entities/gp-fund-scale.entity';
import { UpdateGpFundMarkupDto } from './dto/update-gp-fund-markup.dto';
import {
  buildGpFundBreakdown,
  calculateAnnualMarkupAmount,
  calculateMonthlyMarkupAmount,
  GP_FUND_DEDUCTION_CODE,
  GP_FUND_MONTHLY_MARKUP_CODE,
  GpFundAmountBreakdown,
  GpFundMarkupRates,
  resolveGpFundAmount,
} from './gp-fund.utils';

const GP_SCALE_CODES = Array.from({ length: 22 }, (_, index) => `B-${index + 1}`);

@Injectable()
export class GpFundService {
  constructor(
    @InjectRepository(GpFundRecord)
    private readonly gpFundRepository: Repository<GpFundRecord>,
    @InjectRepository(GpFundMarkupSettings)
    private readonly gpFundMarkupRepository: Repository<GpFundMarkupSettings>,
    @InjectRepository(GpFundScale)
    private readonly gpFundScaleRepository: Repository<GpFundScale>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Payroll)
    private readonly payrollsRepository: Repository<Payroll>,
  ) {}

  async findAll(): Promise<GpFundRecord[]> {
    return this.gpFundRepository.find({ order: { year: 'ASC' } });
  }

  async findOne(id: number): Promise<GpFundRecord> {
    const record = await this.gpFundRepository.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`GP Fund record with ID ${id} not found`);
    }
    return record;
  }

  async findByYear(year: number): Promise<GpFundRecord | null> {
    return this.gpFundRepository.findOne({ where: { year } });
  }

  async findAllScales(): Promise<GpFundScale[]> {
    await this.ensureDefaultScales();
    return this.gpFundScaleRepository.find({ order: { code: 'ASC' } });
  }

  async getScaleValueMap(): Promise<Map<string, number>> {
    await this.ensureDefaultScales();
    const scales = await this.gpFundScaleRepository.find();
    const map = new Map<string, number>();
    for (const scale of scales) {
      map.set(scale.code.toUpperCase(), Number(scale.value));
    }
    return map;
  }

  resolveGpFundAmountForEmployee(
    employee: Employee,
    scaleMap: Map<string, number>,
  ) {
    return resolveGpFundAmount(employee, scaleMap);
  }

  async getMarkupSettings(): Promise<GpFundMarkupSettings> {
    let settings = await this.gpFundMarkupRepository.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = this.gpFundMarkupRepository.create({
        id: 1,
        monthlyMarkupRate: 0,
        annualMarkupRate: 0,
      });
      await this.gpFundMarkupRepository.save(settings);
    }
    return settings;
  }

  async updateMarkupSettings(dto: UpdateGpFundMarkupDto): Promise<GpFundMarkupSettings> {
    const settings = await this.getMarkupSettings();
    const hasChanges =
      (dto.monthlyMarkupRate !== undefined
        && Number(dto.monthlyMarkupRate) !== Number(settings.monthlyMarkupRate))
      || (dto.annualMarkupRate !== undefined
        && Number(dto.annualMarkupRate) !== Number(settings.annualMarkupRate));

    if (!hasChanges) {
      throw new NoChangesException();
    }

    if (dto.monthlyMarkupRate !== undefined) {
      settings.monthlyMarkupRate = dto.monthlyMarkupRate;
    }
    if (dto.annualMarkupRate !== undefined) {
      settings.annualMarkupRate = dto.annualMarkupRate;
    }

    return this.gpFundMarkupRepository.save(settings);
  }

  getMarkupRatesFromSettings(settings: GpFundMarkupSettings): GpFundMarkupRates {
    return {
      monthlyMarkupRate: Number(settings.monthlyMarkupRate ?? 0),
      annualMarkupRate: Number(settings.annualMarkupRate ?? 0),
    };
  }

  async resolveGpFundWithMarkupForPayroll(
    employee: Employee,
    scaleMap: Map<string, number>,
    markupRates: GpFundMarkupRates,
    month: number,
    year: number,
  ): Promise<GpFundAmountBreakdown> {
    const base = resolveGpFundAmount(employee, scaleMap);
    if (base.amount <= 0 || !base.scaleCode) {
      return buildGpFundBreakdown(base, markupRates, 0);
    }

    let annualMarkupAmount = 0;
    if (month === 12 && markupRates.annualMarkupRate > 0) {
      const ytd = await this.getYearToDateGpFundTotals(employee.id, year, month);
      const monthlyMarkupAmount = calculateMonthlyMarkupAmount(
        base.amount,
        markupRates.monthlyMarkupRate,
      );
      const yearSubtotal = roundAmount(
        ytd.baseTotal + ytd.monthlyMarkupTotal + base.amount + monthlyMarkupAmount,
      );
      annualMarkupAmount = calculateAnnualMarkupAmount(
        yearSubtotal,
        markupRates.annualMarkupRate,
      );
    }

    return buildGpFundBreakdown(base, markupRates, annualMarkupAmount);
  }

  private async getYearToDateGpFundTotals(
    employeeId: number,
    year: number,
    beforeMonth: number,
  ): Promise<{ baseTotal: number; monthlyMarkupTotal: number }> {
    const payrolls = await this.payrollsRepository.find({
      where: { employeeId, year },
      relations: { deductions: true },
    });

    let baseTotal = 0;
    let monthlyMarkupTotal = 0;

    for (const payroll of payrolls) {
      if (payroll.month >= beforeMonth) continue;
      for (const deduction of payroll.deductions ?? []) {
        if (deduction.code === GP_FUND_DEDUCTION_CODE) {
          baseTotal += Number(deduction.amount);
        } else if (deduction.code === GP_FUND_MONTHLY_MARKUP_CODE) {
          monthlyMarkupTotal += Number(deduction.amount);
        }
      }
    }

    return {
      baseTotal: roundAmount(baseTotal),
      monthlyMarkupTotal: roundAmount(monthlyMarkupTotal),
    };
  }

  async createScale(dto: CreateGpFundScaleDto): Promise<GpFundScale> {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.gpFundScaleRepository.findOne({ where: { code } });
    if (existing) {
      throw new ConflictException(`GP Fund scale ${code} already exists`);
    }
    const scale = this.gpFundScaleRepository.create({
      code,
      value: dto.value ?? 0,
    });
    return this.gpFundScaleRepository.save(scale);
  }

  async updateScale(id: number, dto: UpdateGpFundScaleDto): Promise<GpFundScale> {
    await this.ensureDefaultScales();
    const scale = await this.gpFundScaleRepository.findOne({ where: { id } });
    if (!scale) {
      throw new NotFoundException(`GP Fund scale with ID ${id} not found`);
    }
    if (Number(scale.value) === Number(dto.value)) {
      throw new NoChangesException();
    }
    scale.value = dto.value;
    return this.gpFundScaleRepository.save(scale);
  }

  async removeScale(id: number): Promise<{ message: string }> {
    const scale = await this.gpFundScaleRepository.findOne({ where: { id } });
    if (!scale) {
      throw new NotFoundException(`GP Fund scale with ID ${id} not found`);
    }

    const usageCount = await this.employeeRepository.count({
      where: { gpFund: scale.code },
    });
    if (usageCount > 0) {
      throw new BadRequestException(
        `GP Fund scale ${scale.code} is assigned to ${usageCount} employee(s) and cannot be deleted`,
      );
    }

    await this.gpFundScaleRepository.remove(scale);
    return { message: `GP Fund scale ${scale.code} deleted successfully` };
  }

  async create(dto: CreateGpFundRecordDto): Promise<GpFundRecord[]> {
    const existing = await this.findByYear(dto.year);
    if (existing) {
      throw new ConflictException(`GP Fund record for year ${dto.year} already exists`);
    }

    const record = this.gpFundRepository.create({
      year: dto.year,
      yearlyTaxCollection: dto.yearlyTaxCollection,
      markupRate: dto.markupRate ?? null,
      markupTaxAmount: dto.markupTaxAmount ?? 0,
      openingBalance: 0,
      closingBalance: 0,
    });

    await this.gpFundRepository.save(record);
    return this.recalculateAllBalances();
  }

  async update(id: number, dto: UpdateGpFundRecordDto): Promise<GpFundRecord[]> {
    const record = await this.findOne(id);

    const hasChanges =
      (dto.year !== undefined && dto.year !== record.year) ||
      (dto.yearlyTaxCollection !== undefined && Number(dto.yearlyTaxCollection) !== Number(record.yearlyTaxCollection)) ||
      (dto.markupRate !== undefined && !isSameOptionalNumber(dto.markupRate, record.markupRate ? Number(record.markupRate) : null)) ||
      (dto.markupTaxAmount !== undefined && Number(dto.markupTaxAmount) !== Number(record.markupTaxAmount ?? 0));

    if (!hasChanges) {
      throw new NoChangesException();
    }

    if (dto.year !== undefined && dto.year !== record.year) {
      const conflict = await this.findByYear(dto.year);
      if (conflict && conflict.id !== id) {
        throw new ConflictException(`GP Fund record for year ${dto.year} already exists`);
      }
      record.year = dto.year;
    }

    if (dto.yearlyTaxCollection !== undefined) {
      record.yearlyTaxCollection = dto.yearlyTaxCollection;
    }
    if (dto.markupRate !== undefined) {
      record.markupRate = dto.markupRate;
    }
    if (dto.markupTaxAmount !== undefined) {
      record.markupTaxAmount = dto.markupTaxAmount;
    }

    await this.gpFundRepository.save(record);
    return this.recalculateAllBalances();
  }

  async remove(id: number): Promise<GpFundRecord[]> {
    const record = await this.findOne(id);
    await this.gpFundRepository.remove(record);
    return this.recalculateAllBalances();
  }

  async getSuggestedTaxCollection(year: number): Promise<{
    year: number;
    suggestedAmount: number;
    payrollCount: number;
    source: string;
  }> {
    const payrolls = await this.payrollsRepository.find({ where: { year } });

    const suggestedAmount = payrolls.reduce(
      (sum, p) => sum + Number(p.totalDeductions),
      0,
    );

    return {
      year,
      suggestedAmount: roundAmount(suggestedAmount),
      payrollCount: payrolls.length,
      source: 'Sum of total payroll deductions for the year',
    };
  }

  /**
   * Recalculates opening/closing balances for all years in order.
   * First year opening = 0; each subsequent year opening = previous closing.
   * Closing = opening + yearlyTaxCollection + markupTaxAmount
   */
  async recalculateAllBalances(): Promise<GpFundRecord[]> {
    const records = await this.gpFundRepository.find({ order: { year: 'ASC' } });

    let previousClosing = 0;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const opening = i === 0 ? 0 : previousClosing;
      const collection = Number(record.yearlyTaxCollection);
      const markup = Number(record.markupTaxAmount ?? 0);
      const closing = roundAmount(opening + collection + markup);

      record.openingBalance = opening;
      record.closingBalance = closing;
      previousClosing = closing;

      await this.gpFundRepository.save(record);
    }

    return this.gpFundRepository.find({ order: { year: 'ASC' } });
  }

  private async ensureDefaultScales(): Promise<void> {
    const existing = await this.gpFundScaleRepository.find();
    const existingCodes = new Set(existing.map((scale) => scale.code));
    const missing = GP_SCALE_CODES.filter((code) => !existingCodes.has(code));

    if (missing.length === 0) return;

    await this.gpFundScaleRepository.save(
      missing.map((code) =>
        this.gpFundScaleRepository.create({
          code,
          value: 0,
        }),
      ),
    );
  }
}
