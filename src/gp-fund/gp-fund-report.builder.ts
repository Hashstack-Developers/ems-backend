import { parseAmount, roundAmount } from '../common/utils/currency.utils';
import { Employee, EmploymentType } from '../employees/entities/employee.entity';
import { getEmployeeFullName } from '../employees/employee.utils';
import { SALARY_SLIP_BANK } from '../payrolls/salary-slip.constants';
import { isSlipFieldEmpty } from '../payrolls/salary-slip.builder';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface GpFundReportInfoField {
  label: string;
  value: string;
}

export interface GpFundReportContributionRow {
  label: string;
  month: number;
  year: number;
  subscriptionValue: number;
  gpFundBaseAmount: number;
  monthlyMarkupAmount: number;
  annualMarkupAmount: number;
  advanceInstallmentAmount: number;
  gpFundAmount: number;
}

export interface GpFundSlipTableRow {
  srNo: number;
  subscriptionPerMonth: number;
  tenure: string;
  closingBalance: number;
  currentBalance: number;
  collectionRate: string;
  markupAmount: number;
  totalBalanceInclusiveMarkup: number;
}

export interface GpFundLoanRecovery {
  totalPayable: number;
  recoveredTill: number;
  balancePayable: number;
}

export interface GpFundReportPayload {
  reportNumber: string;
  dated: string;
  periodLabel: string;
  organization: {
    title: string;
    subtitle: string;
    documentTitle: string;
  };
  employee: {
    id: number;
    employeeCode: string;
  };
  employeeInfoFields: GpFundReportInfoField[];
  fundTableRows: GpFundSlipTableRow[];
  loanRecovery: GpFundLoanRecovery;
  totalGpfBalance: number;
  notes: string[];
  generatedAt: string;
}

function formatSlipDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatDated(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTH_NAMES[date.getMonth()].slice(0, 3);
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

function formatEmploymentStatus(value: EmploymentType | null | undefined): string {
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function buildPeriodLabel(years?: number[], months?: number[]): string {
  if (!years?.length && !months?.length) return 'All periods';
  const monthPart = months?.length
    ? months.map((month) => MONTH_NAMES[month - 1]).join(', ')
    : '';
  const yearPart = years?.length ? years.join(', ') : '';
  if (monthPart && yearPart) return `${monthPart} — ${yearPart}`;
  return monthPart || yearPart || 'All periods';
}

function buildEmployeeInfoFields(employee: Employee, dated: string): GpFundReportInfoField[] {
  const rows: Array<[string, string]> = [
    ['Dated', dated],
    ['Date of Birth', formatSlipDate(employee.dateOfBirth)],
    ['Bank Name', SALARY_SLIP_BANK.name],
    ['Employee ID', employee.employeeCode],
    ['Superannuation Date', formatSlipDate(employee.dateOfRetirement)],
    ['Branch', SALARY_SLIP_BANK.branch],
    ['Name', getEmployeeFullName(employee)],
    ['Date of Joining', formatSlipDate(employee.dateOfJoining)],
    ['Branch Code', SALARY_SLIP_BANK.branchCode],
    ["Father's Name", employee.fatherName ?? '—'],
    ['Date of Regularization', formatSlipDate(employee.dateOfRegularization)],
    ['Employee Account #', employee.accountNumber ?? '—'],
    ['Designation', employee.designation],
    ['Length of Service', employee.lengthOfService ?? '—'],
    ['GPF Account #', employee.gpfAccountNumber ?? '—'],
    ['BPS', employee.basicPayScale ?? '—'],
    ['Stage', employee.stage ?? '—'],
    ['CNIC #', employee.cnicNo ?? '—'],
    ['Status', formatEmploymentStatus(employee.employmentType)],
    ['Contact', employee.mobile ?? '—'],
    ['Name of Nominee', employee.nomineeName ?? '—'],
    ['Relation of Nominee', employee.nomineeRelation ?? '—'],
  ];

  return rows
    .filter(([, value]) => !isSlipFieldEmpty(value))
    .map(([label, value]) => ({ label, value: value.trim() }));
}

function buildFundTableRows(
  employee: Employee,
  contributions: GpFundReportContributionRow[],
  monthlyMarkupRate: number,
  annualMarkupRate: number,
): { rows: GpFundSlipTableRow[]; totalGpfBalance: number } {
  let runningTotal = roundAmount(employee.previouslyCollectedGpFund);

  const rows = contributions.map((contrib, index) => {
    const closingBalance = runningTotal;
    const baseAmount = roundAmount(contrib.gpFundBaseAmount);
    const markupAmount = roundAmount(contrib.monthlyMarkupAmount + contrib.annualMarkupAmount);
    const currentBalance = roundAmount(closingBalance + baseAmount);
    const totalBalanceInclusiveMarkup = roundAmount(currentBalance + markupAmount);

    let collectionRate = '—';
    if (contrib.annualMarkupAmount > 0) {
      collectionRate = `${annualMarkupRate}%`;
    } else if (contrib.monthlyMarkupAmount > 0) {
      collectionRate = `${monthlyMarkupRate}%`;
    } else if (parseAmount(employee.gpfCollection) > 0) {
      collectionRate = `${parseAmount(employee.gpfCollection)}%`;
    }

    runningTotal = roundAmount(closingBalance + contrib.gpFundAmount);

    return {
      srNo: index + 1,
      subscriptionPerMonth: roundAmount(contrib.subscriptionValue),
      tenure: contrib.label,
      closingBalance,
      currentBalance,
      collectionRate,
      markupAmount,
      totalBalanceInclusiveMarkup,
    };
  });

  return { rows, totalGpfBalance: runningTotal };
}

function buildLoanRecovery(
  totalPayable: number,
  recoveredTill: number,
): GpFundLoanRecovery {
  const payable = roundAmount(totalPayable);
  const recovered = roundAmount(recoveredTill);
  return {
    totalPayable: payable,
    recoveredTill: recovered,
    balancePayable: roundAmount(Math.max(0, payable - recovered)),
  };
}

export interface BuildGpFundReportInput {
  employee: Employee;
  subscriptionValue: number;
  totalCollected: number;
  monthlyMarkupRate: number;
  annualMarkupRate: number;
  contributions: GpFundReportContributionRow[];
  advancePayable: number;
  advanceRecovered: number;
  years?: number[];
  months?: number[];
}

export function buildGpFundReportPayload(input: BuildGpFundReportInput): GpFundReportPayload {
  const emp = input.employee;
  const periodLabel = buildPeriodLabel(input.years, input.months);
  const yearToken = input.years?.length === 1 ? String(input.years[0]) : 'ALL';
  const dated = formatDated(new Date().toISOString().slice(0, 10));
  const openingBalance = roundAmount(emp.previouslyCollectedGpFund);
  const { rows: fundTableRows, totalGpfBalance: chainGpfBalance } = buildFundTableRows(
    emp,
    input.contributions,
    input.monthlyMarkupRate,
    input.annualMarkupRate,
  );
  const totalGpfBalance = fundTableRows.length > 0
    ? chainGpfBalance
    : roundAmount(openingBalance + input.totalCollected);

  return {
    reportNumber: `GPF-${yearToken}-${emp.employeeCode}`,
    dated,
    periodLabel,
    organization: {
      title: 'WALLED CITY OF LAHORE AUTHORITY',
      subtitle: 'GOVERNMENT OF THE PUNJAB',
      documentTitle: 'GENERAL PROVIDENT FUND SLIP',
    },
    employee: {
      id: emp.id,
      employeeCode: emp.employeeCode,
    },
    employeeInfoFields: buildEmployeeInfoFields(emp, dated),
    fundTableRows,
    loanRecovery: buildLoanRecovery(input.advancePayable, input.advanceRecovered),
    totalGpfBalance,
    notes: [
      'System generated documents required no signatures.',
      'All amounts are in Pak Rupees.',
      'Errors & omissions accepted.',
    ],
    generatedAt: new Date().toISOString(),
  };
}
