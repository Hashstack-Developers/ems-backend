import { CreateEmployeeDto } from '../../employees/dto/create-employee.dto';
import {
  DisabilityStatus,
  EmployeeStatus,
  EmploymentType,
} from '../../employees/entities/employee.entity';
import { DEMO_EMAIL_DOMAIN } from '../demo-seed.constants';

export type DemoEmployeeProfile = CreateEmployeeDto & { profileKey: string };

function cnic(index: number): string {
  const middle = String(1_000_000 + index).padStart(7, '0');
  const check = index % 10;
  return `35201-${middle}-${check}`;
}

function mobile(index: number): string {
  return `0300${String(1_000_000 + index).slice(-7)}`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function salaryParts(base: number) {
  const personalAllowance = Math.round(base * 0.08);
  const hr = Math.round(base * 0.04);
  const ca = Math.round(base * 0.03);
  const ma = Math.round(base * 0.025);
  const adHoc = Math.round(base * 0.02);
  const grossSalary = round2(
    base + personalAllowance + hr + ca + ma + adHoc * 3,
  );
  const grossSalaryWithTaxes = round2(grossSalary + Math.round(base * 0.15));

  return {
    basicPayDec2025: base,
    basicPayJul2026: round2(base * 1.1),
    personalAllowance,
    hr,
    ca,
    ma,
    adHocAllowance2022: adHoc,
    adHocAllowance2023: adHoc,
    adHocAllowance2024: adHoc,
    adHocAllowance2025: adHoc,
    adHocAllowance2026: adHoc,
    personalPay: Math.round(base * 0.05),
    overtimeAllowance: Math.round(base * 0.03),
    integratedAllowance: Math.round(base * 0.02),
    wa: Math.round(base * 0.015),
    computerAllowance: 2000,
    specialAllowance: Math.round(base * 0.04),
    specialPay: Math.round(base * 0.03),
    mphilSpecialAllowance: 0,
    socialSecurityBenefit: 1500,
    grossSalary,
    grossSalaryWithTaxes,
    netPayable: round2(grossSalaryWithTaxes * 0.82),
    annualIncomeTax202526: round2(grossSalaryWithTaxes * 12 * 0.08),
    totalDeductedIncomeTax202526: round2(grossSalaryWithTaxes * 0.08 * 6),
    incomeTaxMay2026: round2(grossSalaryWithTaxes * 0.08),
  };
}

function buildBase(
  index: number,
  profileKey: string,
  overrides: Partial<CreateEmployeeDto>,
): DemoEmployeeProfile {
  const basePay = overrides.basicPayDec2025 ?? 75_000;
  const joiningYear = 2018 + (index % 5);
  const employmentType = overrides.employmentType ?? EmploymentType.REGULAR;

  return {
    ...salaryParts(basePay),
    ...overrides,
    profileKey,
    srNo: String(index).padStart(4, '0'),
    name: overrides.name ?? `Demo Employee ${String(index).padStart(2, '0')}`,
    fatherName: `Muhammad Demo ${index}`,
    address: `${index} Street, Walled City, Lahore, Punjab`,
    designation: overrides.designation ?? 'Assistant Director',
    basicPayScale: overrides.basicPayScale ?? `BPS-${15 + (index % 6)}`,
    religion: 'Islam',
    disability: index % 7 === 0 ? DisabilityStatus.YES : DisabilityStatus.NO,
    dateOfJoining: `${joiningYear}-0${((index % 6) + 1)}-15`,
    contractExpiryDate:
      employmentType === EmploymentType.CONTRACT
        ? (overrides.contractExpiryDate ?? `${joiningYear + 3}-12-31`)
        : undefined,
    employmentType,
    dateOfRegularization:
      employmentType === EmploymentType.CONTRACT
        ? undefined
        : `${joiningYear + 1}-01-01`,
    dateOfBirth: `${1980 + (index % 15)}-0${((index % 8) + 1)}-10`,
    dateOfRetirement: `${1980 + (index % 15) + 60}-0${((index % 8) + 1)}-10`,
    lengthOfService: `${2026 - joiningYear} years`,
    mobile: mobile(index),
    cnicNo: cnic(index),
    email: `demo.employee${index}${DEMO_EMAIL_DOMAIN}`,
    stage: overrides.stage ?? `Department ${String.fromCharCode(65 + (index % 5))}`,
    timePeriod: overrides.timePeriod,
    increment: round2(basePay * 0.05),
    ...salaryParts(overrides.basicPayDec2025 ?? basePay),
    loanAdvance: index % 4 === 0 ? 10_000 : 0,
    deduction: index % 3 === 0 ? 2500 : 0,
    arrears: index % 5 === 0 ? 5000 : 0,
    previousDeduction: 0,
    gpFund: overrides.gpFund ?? `B-${(index % 8) + 1}`,
    previouslyCollectedGpFund: round2(600 * 12 * Math.max(0, 2026 - joiningYear - 1)),
    gpfCollection: 12,
    accountNumber: `PK${String(1_000_000_000_000 + index)}`,
    nomineeName: `Nominee Demo ${index}`,
    nomineeRelation: index % 2 === 0 ? 'Spouse' : 'Son',
    gpfAccountNumber: `GPF-${String(10_000 + index)}`,
    status: EmployeeStatus.ACTIVE,
    mphilSpecialAllowance: overrides.mphilSpecialAllowance ?? 0,
  };
}

export const DEMO_EMPLOYEE_FIXTURES: DemoEmployeeProfile[] = [
  buildBase(1, 'director-general', {
    name: 'Ahmed Hassan Demo',
    designation: 'Director General',
    basicPayScale: 'BPS-20',
    basicPayDec2025: 185_000,
    gpFund: 'B-8',
    stage: 'Administration',
    mphilSpecialAllowance: 15_000,
  }),
  buildBase(2, 'deputy-director', {
    name: 'Fatima Khan Demo',
    designation: 'Deputy Director',
    basicPayScale: 'BPS-18',
    basicPayDec2025: 125_000,
    gpFund: 'B-6',
    stage: 'Finance',
  }),
];

export interface DemoAdvanceFixture {
  profileKey: string;
  advanceAmount: number;
  installmentMonths: number;
  takenDate: string;
  notes?: string;
}

export const DEMO_ADVANCE_FIXTURES: DemoAdvanceFixture[] = [
  {
    profileKey: 'deputy-director',
    advanceAmount: 120_000,
    installmentMonths: 24,
    takenDate: '2024-09-01',
    notes: 'Demo GP fund advance for verification',
  },
];
