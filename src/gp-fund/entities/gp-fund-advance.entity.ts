import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { GpFundAdvancePayment } from './gp-fund-advance-payment.entity';

export enum GpFundAdvanceStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('gp_fund_advances')
export class GpFundAdvance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'employee_id' })
  employeeId: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({
    name: 'advance_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
  })
  advanceAmount: number;

  @Column({ name: 'installment_months', type: 'int' })
  installmentMonths: number;

  @Column({
    name: 'monthly_installment',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  monthlyInstallment: number;

  @Column({
    name: 'amount_repaid',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  amountRepaid: number;

  @Column({ name: 'installments_paid', type: 'int', default: 0 })
  installmentsPaid: number;

  @Column({
    type: 'enum',
    enum: GpFundAdvanceStatus,
    default: GpFundAdvanceStatus.ACTIVE,
  })
  status: GpFundAdvanceStatus;

  @Column({ name: 'taken_date', type: 'date' })
  takenDate: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => GpFundAdvancePayment, (payment) => payment.advance)
  payments: GpFundAdvancePayment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
