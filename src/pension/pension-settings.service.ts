import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PensionSettings } from './entities/pension-settings.entity';
import { roundAmount } from '../common/utils/currency.utils';

@Injectable()
export class PensionSettingsService {
  constructor(
    @InjectRepository(PensionSettings)
    private readonly repo: Repository<PensionSettings>,
  ) {}

  async getSettings(): Promise<PensionSettings> {
    let s = await this.repo.findOne({ where: { id: 1 } });
    if (!s) {
      s = this.repo.create({ id: 1, employeeRate: 0, employerRate: 0 });
      await this.repo.save(s);
    }
    return s;
  }

  async updateSettings(employeeRate: number, employerRate: number): Promise<PensionSettings> {
    await this.repo.upsert({ id: 1, employeeRate, employerRate }, ['id']);
    return this.getSettings();
  }

  computePensionAmount(basicPay: number, rate: number): number {
    return roundAmount(basicPay * rate / 100);
  }
}
