import { Employee } from './entities/employee.entity';
import { roundAmount } from '../common/utils/currency.utils';

export const STANDARD_PAYROLL_MONTH_DAYS = 30;
export const EMPLOYEE_CODE_PREFIX = 'WCLA';

export function extractCnicMiddleSegment(
  cnicNo: string | null | undefined,
): string | null {
  if (!cnicNo) return null;
  const digits = cnicNo.replace(/\D/g, '');
  if (digits.length !== 13) return null;
  return digits.slice(5, 12);
}

export function buildEmployeeCodeFromCnic(
  cnicNo: string | null | undefined,
): string | null {
  const middle = extractCnicMiddleSegment(cnicNo);
  if (!middle) return null;
  return `${EMPLOYEE_CODE_PREFIX}-${middle}`;
}

export function getEmployeeFullName(employee: Pick<Employee, 'name'>): string {
  return employee.name;
}

/** Monthly salary base for payroll & tax slabs (employee field: Gross Salary with Taxes). */
export function getEmployeePayrollGross(employee: Employee): number {
  if (
    employee.grossSalaryWithTaxes != null &&
    Number(employee.grossSalaryWithTaxes) > 0
  ) {
    return Number(employee.grossSalaryWithTaxes);
  }
  if (employee.basicPayDec2025 != null && Number(employee.basicPayDec2025) > 0) {
    return Number(employee.basicPayDec2025);
  }
  return 0;
}

export interface PayrollGrossBreakdown {
  fullGross: number;
  payableGross: number;
  salaryDays: number | null;
}

export function computePayrollGross(employee: Employee): PayrollGrossBreakdown {
  const fullGross = roundAmount(getEmployeePayrollGross(employee));
  const daysRaw = employee.timePeriod?.trim();

  if (!daysRaw || !/^\d+$/.test(daysRaw)) {
    return { fullGross, payableGross: fullGross, salaryDays: null };
  }

  const salaryDays = parseInt(daysRaw, 10);
  if (salaryDays <= 0 || salaryDays >= STANDARD_PAYROLL_MONTH_DAYS) {
    return {
      fullGross,
      payableGross: fullGross,
      salaryDays: salaryDays >= STANDARD_PAYROLL_MONTH_DAYS ? STANDARD_PAYROLL_MONTH_DAYS : null,
    };
  }

  return {
    fullGross,
    payableGross: roundAmount(fullGross * (salaryDays / STANDARD_PAYROLL_MONTH_DAYS)),
    salaryDays,
  };
}

export function computeRetirementDate(dateOfBirth: string): string {
  const dob = new Date(dateOfBirth);
  const retirement = new Date(dob);
  retirement.setFullYear(retirement.getFullYear() + 60);
  retirement.setDate(retirement.getDate() - 1);
  return retirement.toISOString().slice(0, 10);
}

export function computeLengthOfService(dateOfJoining: string): string {
  const join = new Date(dateOfJoining);
  const now = new Date();
  let years = now.getFullYear() - join.getFullYear();
  let months = now.getMonth() - join.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years === 1 ? '' : 's'}`);
  if (months > 0) parts.push(`${months} month${months === 1 ? '' : 's'}`);
  return parts.length > 0 ? parts.join(', ') : 'Less than 1 month';
}
