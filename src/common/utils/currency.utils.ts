export function parseAmount(value: number | string | null | undefined): number {
  if (value == null || value === '') return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Round monetary amounts to the nearest paisa (2 decimal places). */
export function roundAmount(value: number | string | null | undefined): number {
  return Math.round(parseAmount(value) * 100) / 100;
}

export function formatAmount(value: number | string | null | undefined): string {
  return roundAmount(value).toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
