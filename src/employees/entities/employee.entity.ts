import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Payroll } from '../../payrolls/entities/payroll.entity';

export enum EmployeeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum EmploymentType {
  CONTRACT = 'contract',
  REGULAR = 'regular',
}

export enum DisabilityStatus {
  NO = 'no',
  YES = 'yes',
}

const salaryColumn = (name: string) => ({
  name,
  type: 'decimal' as const,
  precision: 12,
  scale: 2,
  nullable: true,
  default: 0,
});

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'employee_code', unique: true })
  employeeCode: string;

  @Column({ name: 'sr_no', type: 'varchar', length: 50, nullable: true })
  srNo: string | null;

  @Column({ length: 200 })
  name: string;

  @Column({ name: 'father_name', type: 'varchar', length: 200, nullable: true })
  fatherName: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column()
  designation: string;

  @Column({ name: 'basic_pay_scale', type: 'varchar', length: 100, nullable: true })
  basicPayScale: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  religion: string | null;

  @Column({
    type: 'enum',
    enum: DisabilityStatus,
    nullable: true,
  })
  disability: DisabilityStatus | null;

  @Column({ name: 'salary_till', type: 'date', nullable: true })
  salaryTill: string | null;

  @Column({ name: 'date_of_joining', type: 'date' })
  dateOfJoining: string;

  @Column({ name: 'contract_expiry_date', type: 'date', nullable: true })
  contractExpiryDate: string | null;

  @Column({
    name: 'employment_type',
    type: 'enum',
    enum: EmploymentType,
    nullable: true,
  })
  employmentType: EmploymentType | null;

  @Column({ name: 'date_of_regularization', type: 'date', nullable: true })
  dateOfRegularization: string | null;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: string | null;

  @Column({ name: 'date_of_retirement', type: 'date', nullable: true })
  dateOfRetirement: string | null;

  @Column({ name: 'length_of_service', type: 'varchar', length: 100, nullable: true })
  lengthOfService: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  mobile: string | null;

  @Column({ name: 'cnic_no', type: 'varchar', length: 20, nullable: true })
  cnicNo: string | null;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  stage: string | null;

  @Column({ name: 'time_period', type: 'varchar', length: 10, nullable: true })
  timePeriod: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, default: 0 })
  increment: number | null;

  @Column(salaryColumn('basic_pay_dec_2025'))
  basicPayDec2025: number | null;

  @Column(salaryColumn('basic_pay_jul_2026'))
  basicPayJul2026: number | null;

  @Column(salaryColumn('personal_allowance'))
  personalAllowance: number | null;

  @Column(salaryColumn('hr_allowance'))
  hr: number | null;

  @Column(salaryColumn('ca_allowance'))
  ca: number | null;

  @Column(salaryColumn('ma_allowance'))
  ma: number | null;

  @Column(salaryColumn('ad_hoc_allowance_2022'))
  adHocAllowance2022: number | null;

  @Column(salaryColumn('ad_hoc_allowance_2023'))
  adHocAllowance2023: number | null;

  @Column(salaryColumn('ad_hoc_allowance_2024'))
  adHocAllowance2024: number | null;

  @Column(salaryColumn('ad_hoc_allowance_2025'))
  adHocAllowance2025: number | null;

  @Column(salaryColumn('ad_hoc_allowance_2026'))
  adHocAllowance2026: number | null;

  @Column(salaryColumn('personal_pay'))
  personalPay: number | null;

  @Column(salaryColumn('overtime_allowance'))
  overtimeAllowance: number | null;

  @Column(salaryColumn('integrated_allowance'))
  integratedAllowance: number | null;

  @Column(salaryColumn('wa_allowance'))
  wa: number | null;

  @Column(salaryColumn('computer_allowance'))
  computerAllowance: number | null;

  @Column(salaryColumn('special_allowance'))
  specialAllowance: number | null;

  @Column(salaryColumn('special_pay'))
  specialPay: number | null;

  @Column(salaryColumn('mphil_special_allowance'))
  mphilSpecialAllowance: number | null;

  @Column(salaryColumn('social_security_benefit'))
  socialSecurityBenefit: number | null;

  @Column(salaryColumn('gross_salary'))
  grossSalary: number | null;

  @Column(salaryColumn('loan_advance'))
  loanAdvance: number | null;

  @Column(salaryColumn('deduction'))
  deduction: number | null;

  @Column(salaryColumn('arrears'))
  arrears: number | null;

  @Column(salaryColumn('previous_deduction'))
  previousDeduction: number | null;

  @Column(salaryColumn('total_deducted_income_tax_2025_26'))
  totalDeductedIncomeTax202526: number | null;

  @Column(salaryColumn('annual_income_tax_2025_26'))
  annualIncomeTax202526: number | null;

  @Column(salaryColumn('gross_salary_with_taxes'))
  grossSalaryWithTaxes: number | null;

  @Column(salaryColumn('income_tax_may_2026'))
  incomeTaxMay2026: number | null;

  @Column({ name: 'gp_fund', type: 'varchar', length: 10, nullable: true })
  gpFund: string | null;

  @Column(salaryColumn('previously_collected_gp_fund'))
  previouslyCollectedGpFund: number | null;

  @Column(salaryColumn('gpf_collection'))
  gpfCollection: number | null;

  @Column(salaryColumn('net_payable'))
  netPayable: number | null;

  @Column({ name: 'account_number', type: 'varchar', length: 50, nullable: true })
  accountNumber: string | null;

  @Column({
    type: 'enum',
    enum: EmployeeStatus,
    default: EmployeeStatus.ACTIVE,
  })
  status: EmployeeStatus;

  @OneToMany(() => Payroll, (payroll) => payroll.employee)
  payrolls: Payroll[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
