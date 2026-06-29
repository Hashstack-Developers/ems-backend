import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GpFundAdvance } from './gp-fund-advance.entity';

@Entity('gp_fund_advance_payments')
export class GpFundAdvancePayment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'advance_id' })
  advanceId: number;

  @ManyToOne(() => GpFundAdvance, (advance) => advance.payments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'advance_id' })
  advance: GpFundAdvance;

  @Column({ name: 'payroll_id', type: 'int', nullable: true })
  payrollId: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'int' })
  month: number;

  @Column({ type: 'int' })
  year: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
