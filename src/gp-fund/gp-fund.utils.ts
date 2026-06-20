import { Employee } from '../employees/entities/employee.entity';

export const GP_FUND_DEDUCTION_CODE = 'GP_FUND';

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

  const subscriptionValue = scaleMap.get(scaleCode) ?? 0;
  const amount = subscriptionValue > 0 ? subscriptionValue : 0;

  return { scaleCode, subscriptionValue, amount };
}
