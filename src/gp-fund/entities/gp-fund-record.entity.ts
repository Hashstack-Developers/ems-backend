import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('gp_fund_records')
export class GpFundRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  year: number;

  @Column({
    name: 'opening_balance',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  openingBalance: number;

  @Column({
    name: 'yearly_tax_collection',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  yearlyTaxCollection: number;

  @Column({
    name: 'markup_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  markupRate: number | null;

  @Column({
    name: 'markup_tax_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  markupTaxAmount: number;

  @Column({
    name: 'closing_balance',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  closingBalance: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
