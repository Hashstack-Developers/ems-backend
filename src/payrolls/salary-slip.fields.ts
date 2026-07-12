import { Employee } from '../employees/entities/employee.entity';

export interface SalarySlipFieldDef {
  label: string;
  getValue: (employee: Employee) => number | string | null | undefined;
}

function num(value: number | string | null | undefined): number {
  if (value == null || value === '') return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function resolveBasicPay(employee: Employee): number {
  const jul = num(employee.basicPayJul2026);
  if (jul > 0) return jul;
  return num(employee.basicPayDec2025);
}

/** Pay & Allowances rows — order and labels match the WCLA printed salary slip. */
export const SALARY_SLIP_ALLOWANCE_FIELDS: SalarySlipFieldDef[] = [
  { label: 'Basic Pay', getValue: (e) => resolveBasicPay(e) },
  { label: 'House Rent Allowance', getValue: (e) => e.hr },
  { label: 'Conveyance Allowance', getValue: (e) => e.ca },
  { label: 'Medical Allowance', getValue: (e) => e.ma },
  { label: 'Ad-hoc Allowance 2022 @ 15% on', getValue: (e) => e.adHocAllowance2022 },
  { label: 'Ad-hoc Allowance 2023 @ 30% on', getValue: (e) => e.adHocAllowance2023 },
  { label: 'Ad-hoc Allowance 2024 @ 20% on', getValue: (e) => e.adHocAllowance2024 },
  { label: 'Ad-hoc Allowance 2025 @ 10% on', getValue: (e) => e.adHocAllowance2025 },
  { label: 'Ad-hoc Allowance 2026 @ 07% on', getValue: (e) => e.adHocAllowance2026 },
  { label: 'Social Security Benefit (SSB)', getValue: (e) => e.socialSecurityBenefit },
  { label: 'Special Pay', getValue: (e) => e.specialPay },
  { label: 'Personal Allowance', getValue: (e) => e.personalAllowance },
  { label: 'Mphil Allowance/Special Allowance', getValue: (e) => e.mphilSpecialAllowance },
  { label: 'Personal Pay', getValue: (e) => e.personalPay },
  { label: 'Overtime Allowance', getValue: (e) => e.overtimeAllowance },
  { label: 'Integrated Allowance', getValue: (e) => e.integratedAllowance },
  { label: 'Washing Allowance', getValue: (e) => e.wa },
  { label: 'Computer Allowance', getValue: (e) => e.computerAllowance },
  { label: 'Special Allowance', getValue: (e) => e.specialAllowance },
  { label: 'Arrears (If any)', getValue: (e) => e.arrears },
];

/** Deduction row labels on the printed slip (amounts come from payroll). */
export const SALARY_SLIP_DEDUCTION_LABELS = {
  incomeTax: 'Income Tax',
  gpFund: 'GP Fund',
  loanAdvance: 'Loan/Advance',
  pension: 'Pension Contribution',
  other: 'Other',
} as const;
