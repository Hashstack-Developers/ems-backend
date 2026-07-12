import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AllowanceSettings } from './entities/allowance-settings.entity';
import { roundAmount } from '../common/utils/currency.utils';

@Injectable()
export class AllowanceSettingsService {
  constructor(
    @InjectRepository(AllowanceSettings)
    private readonly repo: Repository<AllowanceSettings>,
  ) {}

  async getSettings(): Promise<AllowanceSettings> {
    let settings = await this.repo.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = this.repo.create({ id: 1, welfareRate: 0, managementRate: 0 });
      await this.repo.save(settings);
    }
    return settings;
  }

  async updateSettings(welfareRate: number, managementRate: number): Promise<AllowanceSettings> {
    await this.repo.upsert({ id: 1, welfareRate, managementRate }, ['id']);
    return this.getSettings();
  }

  /** Resolve effective rates for an employee (custom override or default). */
  resolveRates(
    settings: AllowanceSettings,
    employeeWelfareRate: number | null | undefined,
    employeeManagementRate: number | null | undefined,
  ): { welfareRate: number; managementRate: number } {
    return {
      welfareRate: employeeWelfareRate != null ? Number(employeeWelfareRate) : Number(settings.welfareRate),
      managementRate: employeeManagementRate != null ? Number(employeeManagementRate) : Number(settings.managementRate),
    };
  }

  /** Compute allowance amounts from basic pay and rates. */
  computeAmounts(
    basicPay: number,
    welfareRate: number,
    managementRate: number,
  ): { welfareAmount: number; managementAmount: number } {
    return {
      welfareAmount: roundAmount(basicPay * welfareRate / 100),
      managementAmount: roundAmount(basicPay * managementRate / 100),
    };
  }
}
