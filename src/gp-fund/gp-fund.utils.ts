import { Employee } from '../employees/entities/employee.entity';
import { roundAmount } from '../common/utils/currency.utils';

export const GP_FUND_DEDUCTION_CODE = 'GP_FUND';
export const GP_FUND_MONTHLY_MARKUP_CODE = 'GP_FUND_MONTHLY_MARKUP';
export const GP_FUND_ANNUAL_MARKUP_CODE = 'GP_FUND_ANNUAL_MARKUP';
export const GP_FUND_ADVANCE_CODE = 'GP_FUND_ADVANCE';

export const GP_FUND_DEDUCTION_CODES = [
  GP_FUND_DEDUCTION_CODE,
  GP_FUND_MONTHLY_MARKUP_CODE,
  GP_FUND_ANNUAL_MARKUP_CODE,
  GP_FUND_ADVANCE_CODE,
] as const;

export const GP_FUND_ADVANCE_MAX_MONTHS = 36;

/** An advance cannot exceed this percentage of the employee's current total GP fund balance. */
export const GP_FUND_ADVANCE_MAX_PERCENTAGE_OF_BALANCE = 80;

/** GP fund year runs July -> June; the annual markup is calculated and posted at that year's June close. */
export const GP_FUND_FISCAL_YEAR_START_MONTH = 7;
export const GP_FUND_FISCAL_YEAR_CLOSE_MONTH = 6;

/** Maps a calendar month/year to the GP fund fiscal year it belongs to (named after its starting July). */
export function getGpFundFiscalYear(month: number, year: number): number {
  return month >= GP_FUND_FISCAL_YEAR_START_MONTH ? year : year - 1;
}

export interface GpFundMarkupRates {
  annualMarkupRate: number;
}

export interface GpFundAmountBreakdown {
  scaleCode: string | null;
  subscriptionValue: number;
  baseAmount: number;
  monthlyMarkupAmount: number;
  annualMarkupAmount: number;
  totalAmount: number;
}

export function resolveGpFundScaleCode(employee: Pick<Employee, 'gpFund'>): string | null {
  const code = employee.gpFund?.trim().toUpperCase();
  return code || null;
}

export function resolveGpFundAmount(
  employee: Pick<Employee, 'gpFund'>,
  scaleMap: Map<string, number>,
): { scaleCode: string | null; subscriptionValue: number; amount: number } {
  const scaleCode = resolveGpFundScaleCode(employee);
  if (!scaleCode) {
    return { scaleCode: null, subscriptionValue: 0, amount: 0 };
  }

  const subscriptionValue = roundAmount(scaleMap.get(scaleCode) ?? 0);
  const amount = subscriptionValue > 0 ? subscriptionValue : 0;

  return { scaleCode, subscriptionValue, amount };
}

export function calculateAnnualMarkupAmount(
  yearSubtotal: number,
  annualMarkupRate: number,
): number {
  if (yearSubtotal <= 0 || annualMarkupRate <= 0) return 0;
  return roundAmount(yearSubtotal * annualMarkupRate / 100);
}

export function buildGpFundBreakdown(
  base: { scaleCode: string | null; subscriptionValue: number; amount: number },
  annualMarkupAmount = 0,
): GpFundAmountBreakdown {
  return {
    scaleCode: base.scaleCode,
    subscriptionValue: base.subscriptionValue,
    baseAmount: base.amount,
    monthlyMarkupAmount: 0,
    annualMarkupAmount: roundAmount(annualMarkupAmount),
    totalAmount: roundAmount(base.amount + annualMarkupAmount),
  };
}

export interface PayrollGpFundDeductionSlice {
  baseAmount: number;
  monthlyMarkupAmount: number;
  annualMarkupAmount: number;
  advanceInstallmentAmount: number;
  totalAmount: number;
  scaleCode: string | null;
  subscriptionValue: number;
}

export function resolvePayrollGpFundDeductions(
  deductions: Array<{ code: string; amount: number; appliedFixedAmount?: number | null; name?: string }> | undefined,
  employee: Pick<Employee, 'gpFund'> | null | undefined,
  scaleMap: Map<string, number>,
): PayrollGpFundDeductionSlice {
  const baseDeduction = deductions?.find((d) => d.code === GP_FUND_DEDUCTION_CODE);
  const monthlyDeduction = deductions?.find((d) => d.code === GP_FUND_MONTHLY_MARKUP_CODE);
  const annualDeduction = deductions?.find((d) => d.code === GP_FUND_ANNUAL_MARKUP_CODE);

  const advanceDeduction = deductions?.find((d) => d.code === GP_FUND_ADVANCE_CODE);

  if (baseDeduction || monthlyDeduction || annualDeduction || advanceDeduction) {
    const baseAmount = roundAmount(baseDeduction ? baseDeduction.amount : 0);
    const monthlyMarkupAmount = roundAmount(monthlyDeduction ? monthlyDeduction.amount : 0);
    const annualMarkupAmount = roundAmount(annualDeduction ? annualDeduction.amount : 0);
    const advanceInstallmentAmount = roundAmount(advanceDeduction ? advanceDeduction.amount : 0);
    const subscriptionValue = baseDeduction?.appliedFixedAmount != null
      ? roundAmount(baseDeduction.appliedFixedAmount)
      : baseAmount;
    const scaleCode = employee?.gpFund?.trim().toUpperCase()
      ?? extractScaleFromDeductionName(baseDeduction?.name ?? '');

    return {
      baseAmount,
      monthlyMarkupAmount,
      annualMarkupAmount,
      advanceInstallmentAmount,
      totalAmount: roundAmount(
        baseAmount + monthlyMarkupAmount + annualMarkupAmount + advanceInstallmentAmount,
      ),
      scaleCode,
      subscriptionValue,
    };
  }

  if (!employee) {
    return {
      baseAmount: 0,
      monthlyMarkupAmount: 0,
      annualMarkupAmount: 0,
      advanceInstallmentAmount: 0,
      totalAmount: 0,
      scaleCode: null,
      subscriptionValue: 0,
    };
  }

  const legacy = resolveGpFundAmount(employee, scaleMap);
  return {
    baseAmount: roundAmount(legacy.amount),
    monthlyMarkupAmount: 0,
    annualMarkupAmount: 0,
    advanceInstallmentAmount: 0,
    totalAmount: roundAmount(legacy.amount),
    scaleCode: legacy.scaleCode,
    subscriptionValue: legacy.subscriptionValue,
  };
}

export function calculateAdvanceMonthlyInstallment(
  advanceAmount: number,
  installmentMonths: number,
): number {
  if (advanceAmount <= 0 || installmentMonths <= 0) return 0;
  return roundAmount(advanceAmount / installmentMonths);
}

export function getAdvanceRemainingBalance(advance: {
  advanceAmount: number;
  amountRepaid: number;
}): number {
  return roundAmount(Math.max(0, Number(advance.advanceAmount) - Number(advance.amountRepaid)));
}

export function calculateAdvanceInstallmentAmount(advance: {
  advanceAmount: number;
  amountRepaid: number;
  monthlyInstallment: number;
}): number {
  const remaining = getAdvanceRemainingBalance(advance);
  if (remaining <= 0) return 0;
  return roundAmount(Math.min(Number(advance.monthlyInstallment), remaining));
}

function extractScaleFromDeductionName(name: string): string | null {
  const match = name.match(/GP Fund \(([^)]+)\)/i);
  return match?.[1]?.trim().toUpperCase() ?? null;
}
