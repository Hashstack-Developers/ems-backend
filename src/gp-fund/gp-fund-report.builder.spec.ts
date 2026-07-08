import {
  aggregateContributionsForReport,
  GpFundReportContributionRow,
} from './gp-fund-report.builder';

function monthRow(
  month: number,
  year: number,
  gpFundBaseAmount: number,
  annualMarkupAmount = 0,
): GpFundReportContributionRow {
  return {
    label: `Month ${month} ${year}`,
    month,
    year,
    subscriptionValue: 600,
    gpFundBaseAmount,
    monthlyMarkupAmount: 0,
    annualMarkupAmount,
    advanceInstallmentAmount: 0,
    gpFundAmount: gpFundBaseAmount + annualMarkupAmount,
  };
}

describe('aggregateContributionsForReport', () => {
  it('combines a full fiscal year (July -> June) into one annual row', () => {
    const contributions = [
      ...Array.from({ length: 6 }, (_, index) => monthRow(index + 7, 2024, 600)),
      ...Array.from({ length: 6 }, (_, index) => monthRow(index + 1, 2025, 600, index === 5 ? 864 : 0)),
    ];

    const result = aggregateContributionsForReport(contributions);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('July 2024 - June 2025');
    expect(result[0].gpFundBaseAmount).toBe(7200);
    expect(result[0].annualMarkupAmount).toBe(864);
    expect(result[0].gpFundAmount).toBe(8064);
  });

  it('combines partial months within the same fiscal year into one row', () => {
    const contributions = [
      monthRow(7, 2024, 600),
      monthRow(8, 2024, 600),
      monthRow(12, 2024, 600, 432),
    ];

    const result = aggregateContributionsForReport(contributions);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('July 2024 - December 2024');
    expect(result[0].gpFundBaseAmount).toBe(1800);
    expect(result[0].annualMarkupAmount).toBe(432);
  });

  it('returns one row per fiscal year for multi-year reports, spanning January joins that close in June', () => {
    const contributions = [
      // partial fiscal year 2023-24: joined mid-year, Nov 2023 - June 2024
      ...Array.from({ length: 8 }, (_, index) => {
        const month = ((index + 10) % 12) + 1; // Nov, Dec, Jan..Jun
        const year = month >= 11 ? 2023 : 2024;
        return monthRow(month, year, 600, month === 6 ? 300 : 0);
      }),
      // complete fiscal year 2024-25: July 2024 - June 2025
      ...Array.from({ length: 6 }, (_, index) => monthRow(index + 7, 2024, 600)),
      ...Array.from({ length: 6 }, (_, index) => monthRow(index + 1, 2025, 600, index === 5 ? 864 : 0)),
      // partial fiscal year 2025-26: July - Dec 2025
      ...Array.from({ length: 6 }, (_, index) => monthRow(index + 7, 2025, 600)),
    ];

    const result = aggregateContributionsForReport(contributions);

    expect(result).toHaveLength(3);
    expect(result[0].label).toBe('November 2023 - June 2024');
    expect(result[1].label).toBe('July 2024 - June 2025');
    expect(result[2].label).toBe('July 2025 - December 2025');
  });
});
