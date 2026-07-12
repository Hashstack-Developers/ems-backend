import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Payroll } from './payroll.entity';

export enum DeductionCategory {
  INCOME_TAX = 'income_tax',
  SUB_TAX = 'sub_tax',
  GP_FUND = 'gp_fund',
  PENSION = 'pension',
}

export enum DeductionCalculationType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

@Entity('payroll_deductions')
export class PayrollDeduction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'payroll_id' })
  payrollId: number;

  @ManyToOne(() => Payroll, (payroll) => payroll.deductions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'payroll_id' })
  payroll: Payroll;

  @Column()
  name: string;

  @Column()
  code: string;

  @Column({ type: 'enum', enum: DeductionCategory })
  category: DeductionCategory;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  /** Snapshot: how this deduction was calculated at payroll generation time */
  @Column({
    name: 'calculation_type',
    type: 'enum',
    enum: DeductionCalculationType,
    nullable: true,
  })
  calculationType: DeductionCalculationType | null;

  @Column({
    name: 'applied_rate',
    type: 'decimal',
    precision: 10,
    scale: 4,
    nullable: true,
  })
  appliedRate: number | null;

  @Column({
    name: 'applied_fixed_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  appliedFixedAmount: number | null;

  @Column({ name: 'source_sub_tax_id', type: 'int', nullable: true })
  sourceSubTaxId: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
