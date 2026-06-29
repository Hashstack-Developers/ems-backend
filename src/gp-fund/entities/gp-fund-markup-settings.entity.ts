import {
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('gp_fund_markup_settings')
export class GpFundMarkupSettings {
  @PrimaryColumn({ default: 1 })
  id: number;

  @Column({
    name: 'monthly_markup_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  monthlyMarkupRate: number;

  @Column({
    name: 'annual_markup_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  annualMarkupRate: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
