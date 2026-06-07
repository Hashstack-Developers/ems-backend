import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payroll } from '../payrolls/entities/payroll.entity';
import { CreateGpFundRecordDto } from './dto/create-gp-fund-record.dto';
import { UpdateGpFundRecordDto } from './dto/update-gp-fund-record.dto';
import { GpFundRecord } from './entities/gp-fund-record.entity';

@Injectable()
export class GpFundService {
  constructor(
    @InjectRepository(GpFundRecord)
    private readonly gpFundRepository: Repository<GpFundRecord>,
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
      suggestedAmount: this.round(suggestedAmount),
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
      const closing = this.round(opening + collection + markup);

      record.openingBalance = opening;
      record.closingBalance = closing;
      previousClosing = closing;

      await this.gpFundRepository.save(record);
    }

    return this.gpFundRepository.find({ order: { year: 'ASC' } });
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
