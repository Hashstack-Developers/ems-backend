import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { PayrollDeduction } from './payroll-deduction.entity';

export enum PayrollStatus {
  DRAFT = 'draft',
  PROCESSED = 'processed',
  PAID = 'paid',
}

@Entity('payrolls')
@Unique(['employeeId', 'month', 'year'])
export class Payroll {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'employee_id' })
  employeeId: number;

  @ManyToOne(() => Employee, (employee) => employee.payrolls, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ type: 'int' })
  month: number;

  @Column({ type: 'int' })
  year: number;

  @Column({ name: 'basic_salary', type: 'decimal', precision: 12, scale: 2 })
  basicSalary: number;

  @Column({ name: 'gross_salary', type: 'decimal', precision: 12, scale: 2 })
  grossSalary: number;

  @Column({ name: 'salary_days', type: 'int', nullable: true })
  salaryDays: number | null;

  @Column({ name: 'income_tax', type: 'decimal', precision: 12, scale: 2 })
  incomeTax: number;

  @Column({ name: 'total_deductions', type: 'decimal', precision: 12, scale: 2 })
  totalDeductions: number;

  @Column({ name: 'net_salary', type: 'decimal', precision: 12, scale: 2 })
  netSalary: number;

  @Column({ name: 'welfare_allowance_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  welfareAllowanceAmount: number;

  @Column({ name: 'management_allowance_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  managementAllowanceAmount: number;

  @Column({ name: 'pension_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  pensionAmount: number;

  @Column({ name: 'pension_employer_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  pensionEmployerAmount: number;

  @Column({ name: 'tax_slab_id', type: 'int', nullable: true })
  taxSlabId: number | null;

  @Column({ name: 'tax_slab_name', type: 'varchar', length: 100, nullable: true })
  taxSlabName: string | null;

  /** Snapshots frozen at generation — unaffected by future tax config changes */
  @Column({
    name: 'applied_tax_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  appliedTaxRate: number | null;

  @Column({
    name: 'tax_slab_min_salary',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  taxSlabMinSalary: number | null;

  @Column({
    name: 'tax_slab_max_salary',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  taxSlabMaxSalary: number | null;

  @Column({
    type: 'enum',
    enum: PayrollStatus,
    default: PayrollStatus.PROCESSED,
  })
  status: PayrollStatus;

  @OneToMany(() => PayrollDeduction, (deduction) => deduction.payroll, {
    cascade: true,
  })
  deductions: PayrollDeduction[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
