import * as fs from 'fs';
import ExcelJS from 'exceljs';
import { SALARY_SLIP_LOGOS } from '../payrolls/salary-slip.constants';

export const EXCEL_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const ORG = {
  title: 'WALLED CITY OF LAHORE AUTHORITY',
  subtitle: 'GOVERNMENT OF THE PUNJAB',
} as const;

/** Larger logos so they match the PDF-style branded header. */
const LOGO_PX = 110;

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};

export type BrandedExcelOptions = {
  sheetName: string;
  documentTitle: string;
  periodLabel: string;
  /** Optional summary chips shown above the table (row 6). */
  summaryParts?: string[];
  headers: string[];
  rows: ExcelJS.CellValue[][];
  /** 1-based column indexes that should use #,##0.00 */
  numericColumns?: number[];
  columnWidths?: number[];
  emptyMessage?: string;
  /** Optional total row values (same length as headers). */
  totalsRow?: ExcelJS.CellValue[];
  /** 1-based columns in totalsRow to format as currency. */
  totalsNumericColumns?: number[];
  getLogoPath: (filename: string) => string;
};

export async function buildBrandedExcel(
  options: BrandedExcelOptions,
): Promise<Buffer> {
  const {
    sheetName,
    documentTitle,
    periodLabel,
    summaryParts,
    headers,
    rows,
    numericColumns = [],
    columnWidths,
    emptyMessage = 'No records found for this period.',
    totalsRow,
    totalsNumericColumns = [],
    getLogoPath,
  } = options;

  const genLabel = `Generated: ${new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}`;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = ORG.title;
  workbook.created = new Date();

  const lastCol = Math.max(headers.length, 4);
  const headerRowIndex = summaryParts?.length ? 8 : 6;
  const dataStartRow = headerRowIndex + 1;

  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: headerRowIndex }],
  });

  for (let r = 1; r <= 4; r += 1) {
    sheet.mergeCells(r, 1, r, lastCol);
  }

  const titleCell = sheet.getCell('A1');
  titleCell.value = ORG.title;
  titleCell.font = { bold: true, size: 16, name: 'Arial' };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  const subtitleCell = sheet.getCell('A2');
  subtitleCell.value = ORG.subtitle;
  subtitleCell.font = { bold: true, size: 12, name: 'Arial' };
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  const docTitleCell = sheet.getCell('A3');
  docTitleCell.value = documentTitle;
  docTitleCell.font = { bold: true, size: 13, name: 'Arial', underline: true };
  docTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  const metaCell = sheet.getCell('A4');
  metaCell.value = `${periodLabel}   |   ${genLabel}`;
  metaCell.font = { size: 10, name: 'Arial' };
  metaCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Tall header band so large logos sit cleanly beside titles.
  sheet.getRow(1).height = 32;
  sheet.getRow(2).height = 26;
  sheet.getRow(3).height = 26;
  sheet.getRow(4).height = 22;
  sheet.getRow(5).height = 18;

  const leftLogoPath = getLogoPath(SALARY_SLIP_LOGOS.left);
  const rightLogoPath = getLogoPath(SALARY_SLIP_LOGOS.right);
  if (fs.existsSync(leftLogoPath)) {
    const leftImg = workbook.addImage({
      filename: leftLogoPath,
      extension: 'jpeg',
    });
    sheet.addImage(leftImg, {
      tl: { col: 0.15, row: 0.15 },
      ext: { width: LOGO_PX, height: LOGO_PX },
    });
  }
  if (fs.existsSync(rightLogoPath)) {
    const rightImg = workbook.addImage({
      filename: rightLogoPath,
      extension: 'jpeg',
    });
    sheet.addImage(rightImg, {
      tl: { col: Math.max(lastCol - 1.35, 0), row: 0.15 },
      ext: { width: LOGO_PX, height: LOGO_PX },
    });
  }

  if (summaryParts?.length) {
    const summaryRow = sheet.getRow(6);
    summaryRow.font = { bold: true, size: 9, name: 'Arial' };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8E8E8' },
    };
    const span = Math.max(2, Math.floor(lastCol / summaryParts.length));
    summaryParts.forEach((part, i) => {
      const start = i * span + 1;
      const end = i === summaryParts.length - 1 ? lastCol : Math.min(start + span - 1, lastCol);
      if (start <= lastCol) {
        if (end > start) sheet.mergeCells(6, start, 6, end);
        const cell = sheet.getCell(6, start);
        cell.value = part;
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    });
  }

  const headerRow = sheet.getRow(headerRowIndex);
  headerRow.values = headers;
  headerRow.font = { bold: true, size: 9, name: 'Arial' };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD0D0D0' },
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  headerRow.height = 24;
  for (let c = 1; c <= headers.length; c += 1) {
    headerRow.getCell(c).border = thinBorder;
  }

  if (rows.length === 0) {
    sheet.getCell(dataStartRow + 1, 1).value = emptyMessage;
    sheet.getCell(dataStartRow + 1, 1).font = { italic: true, size: 10 };
  } else {
    rows.forEach((values, idx) => {
      const row = sheet.getRow(dataStartRow + idx);
      row.values = values;
      row.font = { size: 9, name: 'Arial' };
      row.alignment = { vertical: 'middle' };
      for (let c = 1; c <= headers.length; c += 1) {
        const cell = row.getCell(c);
        cell.border = thinBorder;
        if (numericColumns.includes(c)) {
          cell.numFmt = '#,##0.00';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
      }
      if (idx % 2 === 1) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFAFAFA' },
        };
      }
    });

    if (totalsRow?.length) {
      const totalRow = sheet.getRow(dataStartRow + rows.length);
      totalRow.values = totalsRow;
      totalRow.font = { bold: true, size: 9, name: 'Arial' };
      totalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8E8E8' },
      };
      for (let c = 1; c <= headers.length; c += 1) {
        const cell = totalRow.getCell(c);
        cell.border = thinBorder;
        if (totalsNumericColumns.includes(c)) {
          cell.numFmt = '#,##0.00';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
      }
    }
  }

  if (columnWidths?.length) {
    sheet.columns = columnWidths.map((width) => ({ width }));
  } else {
    sheet.columns = headers.map((h) => ({
      width: Math.min(28, Math.max(10, h.length + 2)),
    }));
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export function periodLabelForReport(
  month: number | undefined,
  year: number | undefined,
  monthNames: string[],
): string {
  if (month && year) return `Period: ${monthNames[month - 1]} ${year}`;
  if (year) return `Period: Year ${year}`;
  return 'Period: All';
}
