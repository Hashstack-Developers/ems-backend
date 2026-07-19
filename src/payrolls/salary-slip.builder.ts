import { Employee } from '../employees/entities/employee.entity';
import { getEmployeeFullName } from '../employees/employee.utils';
import { parseAmount, roundAmount } from '../common/utils/currency.utils';
import { GpFundAdvance } from '../gp-fund/entities/gp-fund-advance.entity';
import { getAdvanceRemainingBalance } from '../gp-fund/gp-fund.utils';
import {
  GP_FUND_ADVANCE_CODE,
  GP_FUND_ANNUAL_MARKUP_CODE,
  GP_FUND_DEDUCTION_CODE,
  GP_FUND_MONTHLY_MARKUP_CODE,
} from '../gp-fund/gp-fund.utils';
import { PENSION_DEDUCTION_CODE, PENSION_EMPLOYER_DEDUCTION_CODE } from '../pension/pension.utils';
import { Payroll, PayrollStatus } from './entities/payroll.entity';
import { PayrollDeduction } from './entities/payroll-deduction.entity';
import { SALARY_SLIP_BANK } from './salary-slip.constants';
import {
  SALARY_SLIP_ALLOWANCE_FIELDS,
  SALARY_SLIP_DEDUCTION_LABELS,
} from './salary-slip.fields';

export interface SalarySlipLineItem {
  label: string;
  amount: number;
}

export interface SalarySlipRecoverySection {
  title: string;
  payable: number;
  recoveredTill: number;
  recoverable: number;
}

export interface SalarySlipInfoField {
  label: string;
  value: string;
}

export interface SalarySlipPayload {
  payrollId: number;
  slipNumber: string;
  period: { month: number; year: number; label: string };
  dated: string;
  organization: {
    title: string;
    subtitle: string;
    documentTitle: string;
  };
  employee: {
    id: number;
    employeeCode: string;
    fullName: string;
    fatherName: string;
    designation: string;
    basicPayScale: string;
    cnicNo: string;
    mobile: string;
    email: string;
    dateOfBirth: string;
    dateOfRetirement: string;
    dateOfJoining: string;
    lengthOfService: string;
    stage: string;
    employmentType: string;
    bankName: string;
    bankBranch: string;
    accountNumber: string;
  };
  employeeInfoFields: SalarySlipInfoField[];
  allowances: SalarySlipLineItem[];
  deductions: SalarySlipLineItem[];
  loanRecovery: SalarySlipRecoverySection | null;
  taxRecovery: SalarySlipRecoverySection | null;
  earnings: {
    basicSalary: number;
    grossSalary: number;
    salaryDays?: number | null;
  };
  rawDeductions: Array<{
    name: string;
    code: string;
    category: string;
    calculationType: string | null;
    appliedRate: number | null;
    appliedFixedAmount: number | null;
    amount: number;
  }>;
  summary: {
    grossSalary: number;
    totalDeductions: number;
    netSalary: number;
    incomeTax: number;
    taxSlabName: string | null;
    appliedTaxRate: number | null;
  };
  notes: string[];
  status: PayrollStatus;
  generatedAt: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDisplayDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function isSlipFieldEmpty(value: string | null | undefined): boolean {
  if (value == null) return true;
  const trimmed = String(value).trim();
  if (!trimmed) return true;
  if (trimmed === '—' || trimmed === '-' || trimmed === '–') return true;
  if (trimmed.toLowerCase() === 'n/a') return true;
  if (trimmed === '0') return true;
  return false;
}

function buildEmployeeInfoFields(
  employee: SalarySlipPayload['employee'],
): SalarySlipInfoField[] {
  const rows: Array<[string, string]> = [
    // Personal details
    ['Name', employee.fullName],
    ["Father's Name", employee.fatherName],
    ['Date of Birth', employee.dateOfBirth],
    ['CNIC', employee.cnicNo],
    ['Contact', employee.mobile],
    ['Email', employee.email],
    // Employment / service details
    ['Employee ID', employee.employeeCode],
    ['Designation', employee.designation],
    ['BPS', employee.basicPayScale],
    ['Stage', employee.stage],
    ['Status (Regular/Contract)', employee.employmentType],
    ['Date of Joining', employee.dateOfJoining],
    ['Length of Service', employee.lengthOfService],
    ['Superannuation Date', employee.dateOfRetirement],
    // Bank details
    ['Bank Name', employee.bankName],
    ['Branch', employee.bankBranch],
    ['Account No.', employee.accountNumber],
  ];

  return rows
    .filter(([, value]) => !isSlipFieldEmpty(value))
    .map(([label, value]) => ({ label, value: value.trim() }));
}

function allowanceLine(
  label: string,
  amount: number | null | undefined,
): SalarySlipLineItem | null {
  const value = parseAmount(amount);
  if (value <= 0) return null;
  return { label, amount: roundAmount(value) };
}

function buildAllowances(employee: Employee, payroll: Payroll): SalarySlipLineItem[] {
  const lines = SALARY_SLIP_ALLOWANCE_FIELDS.map((field) => {
    const raw = field.getValue(employee);
    const value = typeof raw === 'number' ? raw : parseAmount(raw);
    return allowanceLine(field.label, value);
  }).filter((line): line is SalarySlipLineItem => line != null);

  const welfareAmt = roundAmount(payroll.welfareAllowanceAmount ?? 0);
  const mgmtAmt = roundAmount(payroll.managementAllowanceAmount ?? 0);
  if (welfareAmt > 0) lines.push({ label: 'Welfare Allowance', amount: welfareAmt });
  if (mgmtAmt > 0) lines.push({ label: 'Management Allowance', amount: mgmtAmt });

  const pensionEmployerAmt = roundAmount(payroll.pensionEmployerAmount ?? 0);
  if (pensionEmployerAmt > 0) lines.push({ label: 'Pension (Employer)', amount: pensionEmployerAmt });

  if (lines.length === 0 && parseAmount(employee.grossSalary) > 0) {
    lines.push({ label: 'Gross Salary', amount: roundAmount(employee.grossSalary) });
  } else if (lines.length === 0 && parseAmount(employee.grossSalaryWithTaxes) > 0) {
    lines.push({ label: 'Gross Salary with Taxes', amount: roundAmount(employee.grossSalaryWithTaxes) });
  }

  return lines;
}

function sumLines(lines: SalarySlipLineItem[]): number {
  return roundAmount(lines.reduce((sum, line) => sum + line.amount, 0));
}

function getDeductionAmount(
  deductions: PayrollDeduction[],
  codes: string[],
): number {
  return roundAmount(
    deductions
      .filter((d) => codes.includes(d.code))
      .reduce((sum, d) => sum + parseAmount(d.amount), 0),
  );
}

function buildDeductions(
  payroll: Payroll,
  deductions: PayrollDeduction[],
  employee: Employee,
): SalarySlipLineItem[] {
  const incomeTax = getDeductionAmount(deductions, ['INCOME_TAX', 'INCOME_TAX_FIXED']);
  const subTaxes = roundAmount(
    deductions
      .filter((d) => d.category === 'sub_tax')
      .reduce((sum, d) => sum + parseAmount(d.amount), 0),
  );
  const totalTax = roundAmount(incomeTax + subTaxes);

  const gpFundTotal = roundAmount(
    getDeductionAmount(deductions, [
      GP_FUND_DEDUCTION_CODE,
      GP_FUND_MONTHLY_MARKUP_CODE,
      GP_FUND_ANNUAL_MARKUP_CODE,
    ]),
  );

  const loanAdvance = roundAmount(
    parseAmount(employee.loanAdvance) + getDeductionAmount(deductions, [GP_FUND_ADVANCE_CODE]),
  );

  const pensionEmployee = getDeductionAmount(deductions, [PENSION_DEDUCTION_CODE]);

  const lines: SalarySlipLineItem[] = [
    { label: SALARY_SLIP_DEDUCTION_LABELS.incomeTax, amount: totalTax },
    { label: SALARY_SLIP_DEDUCTION_LABELS.gpFund, amount: gpFundTotal },
    { label: SALARY_SLIP_DEDUCTION_LABELS.loanAdvance, amount: loanAdvance },
  ];

  if (pensionEmployee > 0) {
    lines.push({ label: SALARY_SLIP_DEDUCTION_LABELS.pension, amount: pensionEmployee });
  }

  const otherDeduction = parseAmount(employee.deduction);
  const tracked = roundAmount(sumLines(lines) + otherDeduction);
  const payrollDeductions = parseAmount(payroll.totalDeductions);
  const remainder = roundAmount(payrollDeductions - tracked);
  const otherTotal = roundAmount(otherDeduction + Math.max(0, remainder));

  lines.push({ label: SALARY_SLIP_DEDUCTION_LABELS.other, amount: otherTotal });

  return lines;
}

function buildLoanRecovery(advance: GpFundAdvance | null): SalarySlipRecoverySection | null {
  if (!advance) return null;
  const payable = roundAmount(advance.advanceAmount);
  const recoveredTill = roundAmount(advance.amountRepaid);
  const recoverable = getAdvanceRemainingBalance(advance);
  if (payable <= 0 && recoveredTill <= 0 && recoverable <= 0) return null;

  return {
    title: 'Deduction - Loans and Advances',
    payable,
    recoveredTill,
    recoverable,
  };
}

function buildTaxRecovery(employee: Employee): SalarySlipRecoverySection | null {
  const payable = roundAmount(employee.annualIncomeTax202526);
  const recoveredTill = roundAmount(employee.totalDeductedIncomeTax202526);
  const recoverable = roundAmount(Math.max(0, payable - recoveredTill));
  if (payable <= 0 && recoveredTill <= 0) return null;

  return {
    title: 'Deduction - Income Tax',
    payable,
    recoveredTill,
    recoverable,
  };
}

export function buildSalarySlipPayload(
  payroll: Payroll,
  advance: GpFundAdvance | null = null,
): SalarySlipPayload {
  const emp = payroll.employee;
  const monthLabel = MONTH_NAMES[payroll.month - 1];
  const deductions = payroll.deductions ?? [];
  const allowances = buildAllowances(emp, payroll);
  const allowanceTotal = sumLines(allowances);
  const grossDisplay = allowanceTotal > 0 ? allowanceTotal : roundAmount(payroll.grossSalary);

  const employee = {
    id: emp.id,
    employeeCode: emp.employeeCode,
    fullName: getEmployeeFullName(emp),
    fatherName: emp.fatherName ?? '—',
    designation: emp.designation,
    basicPayScale: emp.basicPayScale ?? '—',
    cnicNo: emp.cnicNo ?? '—',
    mobile: emp.mobile ?? '—',
    email: emp.email,
    dateOfBirth: formatDisplayDate(emp.dateOfBirth),
    dateOfRetirement: formatDisplayDate(emp.dateOfRetirement),
    dateOfJoining: formatDisplayDate(emp.dateOfJoining),
    lengthOfService: emp.lengthOfService ?? '—',
    stage: emp.stage ?? '—',
    employmentType: emp.employmentType ?? '—',
    bankName: SALARY_SLIP_BANK.name,
    bankBranch: SALARY_SLIP_BANK.branch,
    accountNumber: emp.accountNumber ?? '—',
  };

  return {
    payrollId: payroll.id,
    slipNumber: `SLIP-${payroll.year}-${String(payroll.month).padStart(2, '0')}-${emp.employeeCode}`,
    period: {
      month: payroll.month,
      year: payroll.year,
      label: `${monthLabel} ${payroll.year}`,
    },
    dated: formatDisplayDate(new Date().toISOString().slice(0, 10)),
    organization: {
      title: 'WALLED CITY OF LAHORE AUTHORITY',
      subtitle: 'GOVERNMENT OF THE PUNJAB',
      documentTitle: 'SALARY SLIP',
    },
    employee,
    employeeInfoFields: buildEmployeeInfoFields(employee),
    allowances,
    deductions: buildDeductions(payroll, deductions, emp),
    loanRecovery: buildLoanRecovery(advance),
    taxRecovery: buildTaxRecovery(emp),
    earnings: {
      basicSalary: roundAmount(payroll.basicSalary),
      grossSalary: roundAmount(payroll.grossSalary),
      salaryDays: payroll.salaryDays,
    },
    rawDeductions: deductions.map((d) => ({
      name: d.name,
      code: d.code,
      category: d.category,
      calculationType: d.calculationType,
      appliedRate: d.appliedRate != null ? Number(d.appliedRate) : null,
      appliedFixedAmount: d.appliedFixedAmount != null ? Number(d.appliedFixedAmount) : null,
      amount: roundAmount(d.amount),
    })),
    summary: {
      grossSalary: grossDisplay,
      totalDeductions: roundAmount(payroll.totalDeductions),
      netSalary: roundAmount(payroll.netSalary),
      incomeTax: roundAmount(payroll.incomeTax),
      taxSlabName: payroll.taxSlabName,
      appliedTaxRate: payroll.appliedTaxRate != null ? Number(payroll.appliedTaxRate) : null,
    },
    notes: [
      'System generated documents required no signatures.',
      'All amounts are in Pak Rupees.',
      'Recoverable annual income tax can vary as per annual salary.',
      'Errors & omissions accepted.',
    ],
    status: payroll.status,
    generatedAt: new Date().toISOString(),
  };
}
