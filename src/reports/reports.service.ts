import { BadRequestException, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { formatAmount, parseAmount } from '../common/utils/currency.utils';
import { Employee } from '../employees/entities/employee.entity';
import { EmployeesService } from '../employees/employees.service';
import { getEmployeeFullName } from '../employees/employee.utils';
import { GpFundOverviewService } from '../gp-fund/gp-fund-overview.service';
import { Payroll } from '../payrolls/entities/payroll.entity';
import { PayrollsService } from '../payrolls/payrolls.service';
import { PensionOverviewService } from '../pension/pension-overview.service';
import { SALARY_SLIP_BANK, SALARY_SLIP_LOGOS } from '../payrolls/salary-slip.constants';
import { SALARY_SLIP_ALLOWANCE_FIELDS } from '../payrolls/salary-slip.fields';
import { TaxSlabsService } from '../tax-slabs/tax-slabs.service';
import {
  GP_FUND_ADVANCE_CODE,
  GP_FUND_ANNUAL_MARKUP_CODE,
  GP_FUND_DEDUCTION_CODE,
  GP_FUND_MONTHLY_MARKUP_CODE,
} from '../gp-fund/gp-fund.utils';
import { PENSION_DEDUCTION_CODE, PENSION_EMPLOYER_DEDUCTION_CODE } from '../pension/pension.utils';
import {
  buildBrandedExcel,
  EXCEL_CONTENT_TYPE,
  periodLabelForReport,
} from './report-excel.builder';

export type ReportType = 'employees' | 'payrolls' | 'taxes' | 'gpFund' | 'pension';
export type ReportFormat = 'csv' | 'pdf';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ORG = {
  title: 'WALLED CITY OF LAHORE AUTHORITY',
  subtitle: 'GOVERNMENT OF THE PUNJAB',
} as const;

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${d.getFullYear()}`;
}

function fmt(value: number | string | null | undefined): string {
  return formatAmount(value);
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly payrollsService: PayrollsService,
    private readonly taxSlabsService: TaxSlabsService,
    private readonly gpFundOverviewService: GpFundOverviewService,
    private readonly pensionOverviewService: PensionOverviewService,
  ) {}

  async generate(
    type: ReportType,
    format: ReportFormat,
    month?: number,
    year?: number,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    if (!['employees', 'payrolls', 'taxes', 'gpFund', 'pension'].includes(type)) {
      throw new BadRequestException('Invalid report type. Use employees, payrolls, taxes, gpFund, or pension');
    }
    if (!['csv', 'pdf'].includes(format)) {
      throw new BadRequestException('Invalid format. Use csv or pdf');
    }

    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      // CSV cannot embed logos — all "csv" downloads are branded Excel (.xlsx).
      return this.generateSpreadsheet(type, month, year, timestamp);
    }

    const { buffer, filename } = await this.generatePdf(type, month, year, timestamp);
    return { buffer, filename, contentType: 'application/pdf' };
  }

  // ─── Excel (branded, used for former CSV downloads) ────────────────────────

  private async generateSpreadsheet(
    type: ReportType,
    month: number | undefined,
    year: number | undefined,
    timestamp: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const periodLabel = periodLabelForReport(month, year, MONTH_NAMES);
    const getLogoPath = (filename: string) => this.getLogoPath(filename);

    switch (type) {
      case 'employees': {
        const employees = await this.employeesService.findAll();
        const headers = [
          '#',
          'Employee Code',
          'Sr. No.',
          'Full Name',
          "Father's Name",
          'CNIC No.',
          'Mobile',
          'Email',
          'Address',
          'Designation',
          'BPS',
          'Stage',
          'Religion',
          'Disability',
          'Employment Type',
          'Date of Birth',
          'Date of Joining',
          'Date of Regularization',
          'Contract Expiry',
          'Date of Retirement',
          'Length of Service',
          'Status',
          'Basic Pay (Dec 2025)',
          'Basic Pay (Jul 2026)',
          'Personal Allowance',
          'House Rent Allowance',
          'Conveyance Allowance',
          'Medical Allowance',
          'Ad-hoc Allowance 2022',
          'Ad-hoc Allowance 2023',
          'Ad-hoc Allowance 2024',
          'Ad-hoc Allowance 2025',
          'Ad-hoc Allowance 2026',
          'Special Pay',
          'Personal Pay',
          'Overtime Allowance',
          'Integrated Allowance',
          'Washing Allowance',
          'Computer Allowance',
          'Special Allowance',
          'Mphil / Special Allowance',
          'Social Security Benefit',
          'Arrears',
          'Gross Salary',
          'Gross Salary With Taxes',
          'GP Fund Scale',
          'Previously Collected GP Fund',
          'GPF Account Number',
          'Nominee Name',
          'Nominee Relation',
          'Loan / Advance',
          'Other Deduction',
          'Net Payable',
          'Bank Name',
          'Bank Branch',
          'Branch Code',
          'Account Number',
        ];
        const moneyCols = [
          23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 47, 51, 52, 53,
        ];
        const rows = employees.map((e, idx) => [
          idx + 1,
          e.employeeCode,
          e.srNo ?? '',
          e.name,
          e.fatherName ?? '',
          e.cnicNo ?? '',
          e.mobile ?? '',
          e.email,
          e.address ?? '',
          e.designation,
          e.basicPayScale ?? '',
          e.stage ?? '',
          e.religion ?? '',
          e.disability ?? '',
          e.employmentType ?? '',
          e.dateOfBirth ?? '',
          e.dateOfJoining,
          e.dateOfRegularization ?? '',
          e.contractExpiryDate ?? '',
          e.dateOfRetirement ?? '',
          e.lengthOfService ?? '',
          e.status,
          Number(e.basicPayDec2025 ?? 0),
          Number(e.basicPayJul2026 ?? 0),
          Number(e.personalAllowance ?? 0),
          Number(e.hr ?? 0),
          Number(e.ca ?? 0),
          Number(e.ma ?? 0),
          Number(e.adHocAllowance2022 ?? 0),
          Number(e.adHocAllowance2023 ?? 0),
          Number(e.adHocAllowance2024 ?? 0),
          Number(e.adHocAllowance2025 ?? 0),
          Number(e.adHocAllowance2026 ?? 0),
          Number(e.specialPay ?? 0),
          Number(e.personalPay ?? 0),
          Number(e.overtimeAllowance ?? 0),
          Number(e.integratedAllowance ?? 0),
          Number(e.wa ?? 0),
          Number(e.computerAllowance ?? 0),
          Number(e.specialAllowance ?? 0),
          Number(e.mphilSpecialAllowance ?? 0),
          Number(e.socialSecurityBenefit ?? 0),
          Number(e.arrears ?? 0),
          Number(e.grossSalary ?? 0),
          Number(e.grossSalaryWithTaxes ?? 0),
          e.gpFund ?? '',
          Number(e.previouslyCollectedGpFund ?? 0),
          e.gpfAccountNumber ?? '',
          e.nomineeName ?? '',
          e.nomineeRelation ?? '',
          Number(e.loanAdvance ?? 0),
          Number(e.deduction ?? 0),
          Number(e.netPayable ?? 0),
          SALARY_SLIP_BANK.name,
          SALARY_SLIP_BANK.branch,
          SALARY_SLIP_BANK.branchCode,
          e.accountNumber ?? '',
        ]);
        const buffer = await buildBrandedExcel({
          sheetName: 'Employees Report',
          documentTitle: 'EMPLOYEES REPORT',
          periodLabel: 'Period: All employees',
          summaryParts: [`Total Records: ${employees.length}`],
          headers,
          rows,
          numericColumns: moneyCols,
          emptyMessage: 'No employees found.',
          getLogoPath,
        });
        return {
          buffer,
          filename: `employees-report-${timestamp}.xlsx`,
          contentType: EXCEL_CONTENT_TYPE,
        };
      }

      case 'payrolls': {
        const payrolls = await this.payrollsService.findAll(month, year);
        const summary = await this.payrollsService.getSummary(month, year);
        const headers = [
          '#',
          'Employee Code',
          'Employee Name',
          'Designation',
          'Stage',
          'Period',
          'Gross Salary',
          'Tax Slab',
          'Income Tax',
          'Sub-Tax',
          'GP Fund',
          'GP Advance',
          'Employee Pension',
          'Employer Pension',
          'Total Deductions',
          'Net Salary',
          'Status',
        ];
        const rows = payrolls.map((p, idx) => {
          const gpFund = this.getDeductionSum(p, [
            GP_FUND_DEDUCTION_CODE,
            GP_FUND_MONTHLY_MARKUP_CODE,
            GP_FUND_ANNUAL_MARKUP_CODE,
          ]);
          const advance = this.getDeductionSum(p, [GP_FUND_ADVANCE_CODE]);
          const pensionEmployee = this.getPayrollPensionEmployee(p);
          const pensionEmployer = this.getPayrollPensionEmployer(p);
          const subTaxes = (p.deductions ?? [])
            .filter((d) => d.category === 'sub_tax')
            .reduce((s, d) => s + parseAmount(d.amount), 0);
          return [
            idx + 1,
            p.employee?.employeeCode ?? '',
            p.employee ? getEmployeeFullName(p.employee) : '',
            p.employee?.designation ?? '',
            p.employee?.stage ?? '',
            `${MONTH_NAMES[p.month - 1]} ${p.year}`,
            Number(p.grossSalary),
            p.taxSlabName ?? '',
            Number(p.incomeTax),
            Math.round(subTaxes * 100) / 100,
            Math.round(gpFund * 100) / 100,
            Math.round(advance * 100) / 100,
            Math.round(pensionEmployee * 100) / 100,
            Math.round(pensionEmployer * 100) / 100,
            Number(p.totalDeductions),
            Number(p.netSalary),
            p.status,
          ];
        });
        const buffer = await buildBrandedExcel({
          sheetName: 'Payrolls Report',
          documentTitle: 'PAYROLLS REPORT',
          periodLabel,
          summaryParts: [
            `Total Records: ${summary.count}`,
            `Total Gross: ${fmt(summary.totalGross)}`,
            `Total Deductions: ${fmt(summary.totalDeductions)}`,
            `Total Net: ${fmt(summary.totalNet)}`,
          ],
          headers,
          rows,
          numericColumns: [7, 9, 10, 11, 12, 13, 14, 15, 16],
          columnWidths: [5, 14, 22, 16, 12, 14, 12, 14, 11, 10, 10, 11, 14, 14, 14, 12, 10],
          emptyMessage: 'No payroll records found for this period.',
          totalsRow: payrolls.length
            ? [
                '',
                '',
                'TOTAL',
                '',
                '',
                '',
                Number(summary.totalGross),
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                Number(summary.totalDeductions),
                Number(summary.totalNet),
                '',
              ]
            : undefined,
          totalsNumericColumns: [7, 15, 16],
          getLogoPath,
        });
        return {
          buffer,
          filename: `payrolls-report-${timestamp}.xlsx`,
          contentType: EXCEL_CONTENT_TYPE,
        };
      }

      case 'taxes': {
        const [slabs, payrolls] = await Promise.all([
          this.taxSlabsService.findAllTaxSlabs(),
          this.payrollsService.findAll(month, year),
        ]);
        const headers = [
          '#',
          'Category',
          'Slab Name',
          'Name',
          'Code',
          'Min Salary',
          'Max Salary',
          'Rate / Formula',
          'Status',
          'Income Tax',
          'Total Deductions',
          'Net Salary',
        ];
        const slabRows = slabs.flatMap((s) => [
          [
            'Tax Slab',
            s.name,
            s.name,
            '',
            Number(s.minSalary),
            s.maxSalary ? Number(s.maxSalary) : 'Unlimited',
            this.taxSlabsService.formatSlabTaxSummary(s),
            s.isActive ? 'Active' : 'Inactive',
            '',
            '',
            '',
          ],
          ...(s.subTaxes ?? []).map((st) => [
            'Sub-Tax',
            s.name,
            st.name,
            st.code,
            '',
            '',
            st.type === 'percentage' ? `${Number(st.rate)}%` : `Fixed ${Number(st.amount)}`,
            st.isActive ? 'Active' : 'Inactive',
            '',
            '',
            '',
          ]),
        ]);
        const payrollRows = payrolls.map((p) => [
          'Payroll Deduction',
          p.taxSlabName ?? '',
          p.employee ? getEmployeeFullName(p.employee) : '',
          p.employee?.employeeCode ?? '',
          Number(p.grossSalary),
          '',
          p.appliedTaxRate != null ? `${Number(p.appliedTaxRate)}%` : '',
          `${MONTH_NAMES[p.month - 1]} ${p.year}`,
          Number(p.incomeTax),
          Number(p.totalDeductions),
          Number(p.netSalary),
        ]);
        const combined = [...slabRows, ...payrollRows];
        const rows = combined.map((r, idx) => [idx + 1, ...r]);
        const buffer = await buildBrandedExcel({
          sheetName: 'Taxes Report',
          documentTitle: 'TAXES REPORT',
          periodLabel,
          summaryParts: [
            `Tax Slabs / Sub-Taxes: ${slabRows.length}`,
            `Payroll Deduction Rows: ${payrollRows.length}`,
          ],
          headers,
          rows,
          numericColumns: [6, 10, 11, 12],
          emptyMessage: 'No tax data found for this period.',
          getLogoPath,
        });
        return {
          buffer,
          filename: `taxes-report-${timestamp}.xlsx`,
          contentType: EXCEL_CONTENT_TYPE,
        };
      }

      case 'gpFund': {
        const years = year ? [year] : undefined;
        const months = month ? [month] : undefined;
        const overview = await this.gpFundOverviewService.getOverview({ years, months });
        const headers = [
          '#',
          'Employee Code',
          'Employee Name',
          'Designation',
          'GP Fund Scale',
          'Subscription Value',
          'Payroll Count',
          'Base Collected',
          'Annual Markup',
          'Total Collected',
        ];
        const rows = overview.byEmployee.map((emp, idx) => [
          idx + 1,
          emp.employeeCode,
          emp.name,
          emp.designation,
          emp.gpFundScale ?? '',
          emp.subscriptionValue,
          emp.payrollCount,
          emp.totalBaseCollected,
          emp.totalAnnualMarkup,
          emp.totalCollected,
        ]);
        const totalCollected = overview.byEmployee.reduce(
          (s, e) => s + Number(e.totalCollected ?? 0),
          0,
        );
        const buffer = await buildBrandedExcel({
          sheetName: 'GP Fund Report',
          documentTitle: 'GP FUND REPORT',
          periodLabel,
          summaryParts: [
            `Total Employees: ${overview.byEmployee.length}`,
            `Total Collected: ${fmt(totalCollected)}`,
          ],
          headers,
          rows,
          numericColumns: [6, 8, 9, 10],
          columnWidths: [5, 14, 22, 16, 14, 14, 12, 14, 14, 14],
          emptyMessage: 'No GP fund contributions found for the selected period.',
          getLogoPath,
        });
        return {
          buffer,
          filename: `gp-fund-report-${timestamp}.xlsx`,
          contentType: EXCEL_CONTENT_TYPE,
        };
      }

      case 'pension': {
        const years = year ? [year] : undefined;
        const months = month ? [month] : undefined;
        const overview = await this.pensionOverviewService.getOverview({ years, months });
        const headers = [
          '#',
          'Employee Code',
          'Employee Name',
          'Designation',
          'Payroll Count',
          'Employee Pension',
          'Employer Pension',
          'Total Pension',
        ];
        const rows = overview.byEmployee.map((emp, idx) => [
          idx + 1,
          emp.employeeCode,
          emp.name,
          emp.designation,
          emp.count,
          emp.employeePension,
          emp.employerPension,
          emp.total,
        ]);
        const totalPension = overview.byEmployee.reduce((s, e) => s + Number(e.total ?? 0), 0);
        const buffer = await buildBrandedExcel({
          sheetName: 'Pension Report',
          documentTitle: 'PENSION REPORT',
          periodLabel,
          summaryParts: [
            `Total Employees: ${overview.byEmployee.length}`,
            `Total Pension: ${fmt(totalPension)}`,
          ],
          headers,
          rows,
          numericColumns: [6, 7, 8],
          columnWidths: [5, 14, 22, 16, 12, 16, 16, 14],
          emptyMessage: 'No pension contributions found for the selected period.',
          getLogoPath,
        });
        return {
          buffer,
          filename: `pension-report-${timestamp}.xlsx`,
          contentType: EXCEL_CONTENT_TYPE,
        };
      }
    }
  }

  // ─── PDF core helpers ──────────────────────────────────────────────────────

  private getLogoPath(filename: string): string {
    return path.join(__dirname, '..', 'assets', 'salary-slip', filename);
  }

  private drawPageHeader(
    doc: InstanceType<typeof PDFDocument>,
    documentTitle: string,
    subtitle?: string,
  ): number {
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    const logoSize = 52;
    const headerY = doc.page.margins.top;

    const leftLogoPath = this.getLogoPath(SALARY_SLIP_LOGOS.left);
    const rightLogoPath = this.getLogoPath(SALARY_SLIP_LOGOS.right);
    if (fs.existsSync(leftLogoPath)) {
      doc.image(leftLogoPath, left, headerY, { fit: [logoSize, logoSize] });
    }
    if (fs.existsSync(rightLogoPath)) {
      doc.image(rightLogoPath, left + pageWidth - logoSize, headerY, { fit: [logoSize, logoSize] });
    }

    doc.font('Helvetica-Bold').fontSize(13).text(ORG.title, left, headerY + 4, {
      width: pageWidth,
      align: 'center',
    });
    doc.fontSize(11).text(ORG.subtitle, { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(12).text(documentTitle, { align: 'center', underline: true });
    if (subtitle) {
      doc.moveDown(0.15);
      doc.font('Helvetica').fontSize(9).text(subtitle, { align: 'center' });
    }

    const afterHeader = Math.max(doc.y, headerY + logoSize + 6);
    doc.y = afterHeader;
    doc.moveDown(0.5);
    return doc.y;
  }

  private drawTableCell(
    doc: InstanceType<typeof PDFDocument>,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    options: {
      bold?: boolean;
      fontSize?: number;
      align?: 'left' | 'right' | 'center';
      fill?: string;
      textColor?: string;
    } = {},
  ) {
    const { bold = false, fontSize = 7, align = 'left', fill, textColor = '#000' } = options;
    if (fill) {
      doc.rect(x, y, width, height).fillAndStroke(fill, '#000');
    } else {
      doc.rect(x, y, width, height).stroke();
    }
    doc
      .fillColor(textColor)
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(fontSize)
      .text(text, x + 3, y + 3, {
        width: width - 6,
        height: height - 6,
        align,
        lineGap: 0,
      });
    doc.fillColor('#000');
  }

  private checkPageBreak(
    doc: InstanceType<typeof PDFDocument>,
    y: number,
    neededHeight: number,
    documentTitle: string,
    subtitle?: string,
  ): { y: number; newPage: boolean } {
    const bottomMargin = doc.page.margins.bottom;
    if (y + neededHeight > doc.page.height - bottomMargin) {
      doc.addPage();
      const newY = this.drawPageHeader(doc, documentTitle, subtitle);
      return { y: newY, newPage: true };
    }
    return { y, newPage: false };
  }

  private getDeductionSum(payroll: Payroll, codes: string[]): number {
    return (payroll.deductions ?? [])
      .filter((d) => codes.includes(d.code))
      .reduce((s, d) => s + parseAmount(d.amount), 0);
  }

  private getPayrollPensionEmployee(payroll: Payroll): number {
    const fromField = parseAmount(payroll.pensionAmount);
    if (fromField > 0) return fromField;
    return this.getDeductionSum(payroll, [PENSION_DEDUCTION_CODE]);
  }

  private getPayrollPensionEmployer(payroll: Payroll): number {
    const fromField = parseAmount(payroll.pensionEmployerAmount);
    if (fromField > 0) return fromField;
    return this.getDeductionSum(payroll, [PENSION_EMPLOYER_DEDUCTION_CODE]);
  }

  // ─── PDF generators ────────────────────────────────────────────────────────

  private async generatePdf(
    type: ReportType,
    month: number | undefined,
    year: number | undefined,
    timestamp: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: 'A4', autoFirstPage: true });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve({ buffer: Buffer.concat(chunks), filename: `${type}-report-${timestamp}.pdf` }));

        const periodLabel = month && year ? `Period: ${MONTH_NAMES[month - 1]} ${year}` : undefined;
        const genLabel = `Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;

        switch (type) {
          case 'employees':
            await this.renderEmployeesPdf(doc, genLabel);
            break;
          case 'payrolls':
            await this.renderPayrollsPdf(doc, month, year, periodLabel, genLabel);
            break;
          case 'taxes':
            await this.renderTaxesPdf(doc, month, year, periodLabel, genLabel);
            break;
          case 'gpFund':
            await this.renderGpFundPdf(doc, month, year, periodLabel, genLabel);
            break;
          case 'pension':
            await this.renderPensionPdf(doc, month, year, periodLabel, genLabel);
            break;
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ─── Employee Report ───────────────────────────────────────────────────────

  private async renderEmployeesPdf(
    doc: InstanceType<typeof PDFDocument>,
    genLabel: string,
  ) {
    const employees = await this.employeesService.findAll();
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;

    this.drawPageHeader(doc, 'EMPLOYEES REPORT', genLabel);
    doc.font('Helvetica').fontSize(8).text(`Total Employees: ${employees.length}`, left, doc.y);
    doc.moveDown(0.5);

    for (let i = 0; i < employees.length; i++) {
      this.renderEmployeeBlock(doc, employees[i], i + 1, pageWidth, left, genLabel);
    }
  }

  private renderEmployeeBlock(
    doc: InstanceType<typeof PDFDocument>,
    emp: Employee,
    index: number,
    pageWidth: number,
    left: number,
    genLabel: string,
  ) {
    const estimatedHeight = 180;
    const bottomMargin = doc.page.margins.bottom;
    if (doc.y + estimatedHeight > doc.page.height - bottomMargin) {
      doc.addPage();
      this.drawPageHeader(doc, 'EMPLOYEES REPORT', genLabel);
    }

    const startY = doc.y;

    doc.rect(left, startY, pageWidth, 16).fill('#e8e8e8');
    doc.fillColor('#000');
    doc.font('Helvetica-Bold').fontSize(8).text(
      `${index}. ${emp.name}   |   ${emp.employeeCode}   |   ${emp.designation}   |   ${emp.stage ?? ''}`,
      left + 4, startY + 4,
      { width: pageWidth - 8 },
    );

    const infoFields = this.buildEmployeeInfoFields(emp);
    const colW = pageWidth / 3;
    const rowH = 22;
    let infoY = startY + 18;

    infoFields.forEach(([label, value], idx) => {
      const col = idx % 3;
      const cellY = infoY + Math.floor(idx / 3) * rowH;

      if (cellY + rowH > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        this.drawPageHeader(doc, 'EMPLOYEES REPORT', genLabel);
        infoY = doc.y - Math.floor(idx / 3) * rowH;
      }

      const adjustedY = infoY + Math.floor(idx / 3) * rowH;
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#444')
        .text(`${label}:`, left + col * colW + 3, adjustedY + 2, { width: colW - 6 });
      doc.font('Helvetica').fontSize(7.5).fillColor('#000')
        .text(value, left + col * colW + 3, adjustedY + 10, { width: colW - 6 });
    });

    const infoRows = Math.ceil(infoFields.length / 3);
    doc.y = infoY + infoRows * rowH;

    const allowances = SALARY_SLIP_ALLOWANCE_FIELDS
      .map((f) => {
        const raw = f.getValue(emp);
        const val = typeof raw === 'number' ? raw : parseAmount(raw);
        return val > 0 ? { label: f.label, amount: val } : null;
      })
      .filter((x): x is { label: string; amount: number } => x != null);

    if (allowances.length > 0) {
      if (doc.y + 14 + Math.ceil(allowances.length / 3) * 14 > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        this.drawPageHeader(doc, 'EMPLOYEES REPORT', genLabel);
      }

      const salaryY = doc.y + 3;
      doc.rect(left, salaryY, pageWidth, 12).fill('#f4f4f4');
      doc.fillColor('#000').font('Helvetica-Bold').fontSize(7).text('Pay & Allowances', left + 4, salaryY + 3);
      doc.y = salaryY + 14;

      const aColW = pageWidth / 3;
      allowances.forEach(({ label, amount }, idx) => {
        const col = idx % 3;
        const y = doc.y + Math.floor(idx / 3) * 13;
        doc.font('Helvetica').fontSize(6.5).fillColor('#444').text(`${label}:`, left + col * aColW + 3, y + 1, { width: aColW * 0.6 });
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#000').text(fmt(amount), left + col * aColW + aColW * 0.6, y + 1, { width: aColW * 0.37, align: 'right' });
      });

      doc.y = doc.y + Math.ceil(allowances.length / 3) * 13;

      const grossRow = doc.y + 2;
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000')
        .text(`Gross Salary (with Taxes): ${fmt(emp.grossSalaryWithTaxes)}   |   Gross Salary: ${fmt(emp.grossSalary)}`, left + 3, grossRow, { width: pageWidth - 6 });
      doc.y = grossRow + 12;
    }

    const extraY = doc.y + 2;
    const gpInfo: string[] = [];
    if (emp.gpFund?.trim()) gpInfo.push(`GP Fund Scale: ${emp.gpFund}`);
    if (parseAmount(emp.previouslyCollectedGpFund) > 0) gpInfo.push(`Prev. Collected: ${fmt(emp.previouslyCollectedGpFund)}`);
    if (emp.gpfAccountNumber) gpInfo.push(`GPF Account: ${emp.gpfAccountNumber}`);
    if (emp.accountNumber) gpInfo.push(`Bank Account: ${emp.accountNumber}`);
    if (emp.nomineeName) gpInfo.push(`Nominee: ${emp.nomineeName} (${emp.nomineeRelation ?? ''})`);
    if (parseAmount(emp.loanAdvance) > 0) gpInfo.push(`Loan/Advance: ${fmt(emp.loanAdvance)}`);

    if (gpInfo.length > 0) {
      doc.font('Helvetica').fontSize(6.5).fillColor('#555')
        .text(gpInfo.join('   |   '), left + 3, extraY, { width: pageWidth - 6 });
      doc.y = extraY + 10;
    }

    doc.moveTo(left, doc.y + 3).lineTo(left + pageWidth, doc.y + 3).strokeColor('#ccc').lineWidth(0.5).stroke();
    doc.strokeColor('#000').lineWidth(1);
    doc.y = doc.y + 8;
  }

  private buildEmployeeInfoFields(emp: Employee): [string, string][] {
    const fields: [string, string][] = [
      ['Employee ID', emp.employeeCode],
      ['Name', emp.name],
      ["Father's Name", emp.fatherName ?? '—'],
      ['CNIC #', emp.cnicNo ?? '—'],
      ['Date of Birth', formatDate(emp.dateOfBirth)],
      ['Mobile', emp.mobile ?? '—'],
      ['Email', emp.email],
      ['Address', emp.address ?? '—'],
      ['Designation', emp.designation],
      ['BPS', emp.basicPayScale ?? '—'],
      ['Stage', emp.stage ?? '—'],
      ['Status', emp.status],
      ['Employment Type', emp.employmentType ?? '—'],
      ['Religion', emp.religion ?? '—'],
      ['Date of Joining', formatDate(emp.dateOfJoining)],
      ['Date of Regularization', formatDate(emp.dateOfRegularization)],
      ['Contract Expiry', formatDate(emp.contractExpiryDate)],
      ['Length of Service', emp.lengthOfService ?? '—'],
      ['Date of Retirement', formatDate(emp.dateOfRetirement)],
      ['Bank', `${SALARY_SLIP_BANK.name} — ${SALARY_SLIP_BANK.branch}`],
      ['Branch Code', SALARY_SLIP_BANK.branchCode],
      ['Account #', emp.accountNumber ?? '—'],
    ];
    return fields.filter(([, v]) => v && v !== '—');
  }

  // ─── Payrolls Report ───────────────────────────────────────────────────────

  private async renderPayrollsPdf(
    doc: InstanceType<typeof PDFDocument>,
    month: number | undefined,
    year: number | undefined,
    periodLabel: string | undefined,
    genLabel: string,
  ) {
    const payrolls = await this.payrollsService.findAll(month, year);
    const summary = await this.payrollsService.getSummary(month, year);
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;

    const subtitle = [periodLabel, genLabel].filter(Boolean).join('   |   ');
    this.drawPageHeader(doc, 'PAYROLLS REPORT', subtitle);

    const bannerY = doc.y;
    const bannerH = 28;
    doc.rect(left, bannerY, pageWidth, bannerH).fill('#e8e8e8');
    doc.fillColor('#000');
    const bannerCols = [
      { label: 'Total Records', value: String(summary.count) },
      { label: 'Total Gross', value: fmt(summary.totalGross) },
      { label: 'Total Deductions', value: fmt(summary.totalDeductions) },
      { label: 'Total Net', value: fmt(summary.totalNet) },
    ];
    const bColW = pageWidth / bannerCols.length;
    bannerCols.forEach(({ label, value }, i) => {
      const x = left + i * bColW;
      doc.font('Helvetica-Bold').fontSize(6.5).text(label, x + 4, bannerY + 5, { width: bColW - 8 });
      doc.font('Helvetica-Bold').fontSize(8.5).text(value, x + 4, bannerY + 14, { width: bColW - 8 });
    });
    doc.y = bannerY + bannerH + 6;

    if (payrolls.length === 0) {
      doc.font('Helvetica').fontSize(10).text('No payroll records found for this period.', left, doc.y);
      return;
    }

    const cols = [
      { label: '#', width: pageWidth * 0.035, align: 'center' as const },
      { label: 'Employee', width: pageWidth * 0.16, align: 'left' as const },
      { label: 'Designation', width: pageWidth * 0.105, align: 'left' as const },
      { label: 'Gross', width: pageWidth * 0.09, align: 'right' as const },
      { label: 'Income Tax', width: pageWidth * 0.085, align: 'right' as const },
      { label: 'GP Fund', width: pageWidth * 0.08, align: 'right' as const },
      { label: 'Emp. Pension', width: pageWidth * 0.09, align: 'right' as const },
      { label: 'Empr. Pension', width: pageWidth * 0.09, align: 'right' as const },
      { label: 'Other Ded.', width: pageWidth * 0.085, align: 'right' as const },
      { label: 'Net Salary', width: pageWidth * 0.09, align: 'right' as const },
    ];
    const headerH = 24;
    const rowH = 18;
    const docTitle = 'PAYROLLS REPORT';

    const drawTableHeader = (y: number) => {
      let x = left;
      cols.forEach((col) => {
        this.drawTableCell(doc, col.label, x, y, col.width, headerH, {
          bold: true, fontSize: 6, align: col.align, fill: '#d0d0d0',
        });
        x += col.width;
      });
      return y + headerH;
    };

    let y = drawTableHeader(doc.y);

    let totalGp = 0;
    let totalEmpPension = 0;
    let totalEmprPension = 0;
    let totalOther = 0;
    let totalIncomeTax = 0;

    payrolls.forEach((p, idx) => {
      const { y: newY, newPage } = this.checkPageBreak(doc, y, rowH, docTitle, subtitle);
      y = newPage ? drawTableHeader(newY) : newY;

      const gpFund = this.getDeductionSum(p, [GP_FUND_DEDUCTION_CODE, GP_FUND_MONTHLY_MARKUP_CODE, GP_FUND_ANNUAL_MARKUP_CODE]);
      const advance = this.getDeductionSum(p, [GP_FUND_ADVANCE_CODE]);
      const gpTotal = gpFund + advance;
      const pensionEmployee = this.getPayrollPensionEmployee(p);
      const pensionEmployer = this.getPayrollPensionEmployer(p);
      const subTax = (p.deductions ?? []).filter((d) => d.category === 'sub_tax').reduce((s, d) => s + parseAmount(d.amount), 0);
      const otherDed = Math.max(
        0,
        parseAmount(p.totalDeductions) - parseAmount(p.incomeTax) - subTax - gpTotal - pensionEmployee,
      );
      const fill = idx % 2 === 0 ? undefined : '#fafafa';

      totalGp += gpTotal;
      totalEmpPension += pensionEmployee;
      totalEmprPension += pensionEmployer;
      totalOther += otherDed;
      totalIncomeTax += parseAmount(p.incomeTax);

      const rowVals = [
        String(idx + 1),
        `${p.employee?.name ?? ''}\n${p.employee?.employeeCode ?? ''}`,
        `${p.employee?.designation ?? ''}\n${p.employee?.stage ?? ''}`,
        fmt(p.grossSalary),
        fmt(p.incomeTax),
        gpTotal > 0 ? fmt(gpTotal) : '—',
        pensionEmployee > 0 ? fmt(pensionEmployee) : '—',
        pensionEmployer > 0 ? fmt(pensionEmployer) : '—',
        otherDed > 0 ? fmt(otherDed) : '—',
        fmt(p.netSalary),
      ];

      let x = left;
      rowVals.forEach((val, ci) => {
        this.drawTableCell(doc, val, x, y, cols[ci].width, rowH, {
          fontSize: ci === 1 || ci === 2 ? 6 : 6.5, align: cols[ci].align, fill,
        });
        x += cols[ci].width;
      });
      y += rowH;
    });

    const totalVals = [
      '',
      'TOTAL',
      '',
      fmt(summary.totalGross),
      fmt(totalIncomeTax),
      totalGp > 0 ? fmt(totalGp) : '—',
      totalEmpPension > 0 ? fmt(totalEmpPension) : '—',
      totalEmprPension > 0 ? fmt(totalEmprPension) : '—',
      totalOther > 0 ? fmt(totalOther) : '—',
      fmt(summary.totalNet),
    ];
    let x = left;
    totalVals.forEach((val, ci) => {
      this.drawTableCell(doc, val, x, y, cols[ci].width, rowH, {
        bold: true, fontSize: 6.5, align: cols[ci].align, fill: '#e8e8e8',
      });
      x += cols[ci].width;
    });

    doc.y = y + rowH + 6;
    doc.font('Helvetica').fontSize(7).fillColor('#555')
      .text('* GP Fund includes base deduction, advance installment, and annual markup (June only). Employer pension is shown separately and is not part of employee total deductions.', left, doc.y);
  }

  // ─── Taxes Report ─────────────────────────────────────────────────────────

  private async renderTaxesPdf(
    doc: InstanceType<typeof PDFDocument>,
    month: number | undefined,
    year: number | undefined,
    _periodLabel: string | undefined,
    _genLabel: string,
  ) {
    const payrolls = await this.payrollsService.findAll(month, year);
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    const logoSize = 52;

    const yearLabel = year ? `${year}-${String(year + 1).slice(-2)}` : 'All Periods';
    const docTitle = 'INCOME TAX STATEMENT';

    // Group payrolls by employee
    const empMap = new Map<number, { employee: Employee; rows: Payroll[] }>();
    for (const p of payrolls) {
      if (!p.employee) continue;
      if (!empMap.has(p.employeeId)) {
        empMap.set(p.employeeId, { employee: p.employee, rows: [] });
      }
      empMap.get(p.employeeId)!.rows.push(p);
    }

    const employees = [...empMap.values()];

    if (employees.length === 0) {
      this.drawPageHeader(doc, docTitle, `For the Year ${yearLabel}`);
      doc.font('Helvetica').fontSize(10).text('No payroll records found for this period.', left, doc.y);
      return;
    }

    const taxCols = [
      { label: `For the Year ${yearLabel}`, width: pageWidth * 0.46, align: 'left' as const },
      { label: 'Gross Salary', width: pageWidth * 0.27, align: 'right' as const },
      { label: 'Income Tax Deducted', width: pageWidth * 0.27, align: 'right' as const },
    ];
    const colHeaderH = 22;
    const rowH = 18;
    const totalsH = 22;
    const notesH = 52;

    const notes = [
      'System generated documents required no signatures.',
      'All amounts are in Pak Rupees.',
      'Errors & omissions accepted.',
    ];

    const drawEmpHeader = (emp: typeof employees[0]) => {
      const headerY = doc.y;
      const leftLogoPath = this.getLogoPath(SALARY_SLIP_LOGOS.left);
      const rightLogoPath = this.getLogoPath(SALARY_SLIP_LOGOS.right);
      if (fs.existsSync(leftLogoPath)) doc.image(leftLogoPath, left, headerY, { fit: [logoSize, logoSize] });
      if (fs.existsSync(rightLogoPath)) doc.image(rightLogoPath, left + pageWidth - logoSize, headerY, { fit: [logoSize, logoSize] });

      doc.font('Helvetica-Bold').fontSize(13).text(ORG.title, left, headerY + 4, { width: pageWidth, align: 'center' });
      doc.fontSize(11).text(ORG.subtitle, { align: 'center' });
      doc.moveDown(0.2);
      doc.fontSize(12).text(docTitle, { align: 'center', underline: true });
      doc.y = Math.max(doc.y, headerY + logoSize + 6);
      doc.moveDown(0.5);

      // Full employee info — same 3-column grid as salary slip / GP fund
      const infoFields = this.buildEmployeeInfoFields(emp.employee);
      const colW = pageWidth / 3;
      const infoRowH = 26;
      const infoStartY = doc.y;
      infoFields.forEach(([label, value], idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const x = left + col * colW;
        const y = infoStartY + row * infoRowH;
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000').text(`${label}:`, x, y, { width: colW - 8 });
        doc.font('Helvetica').fontSize(7.5).fillColor('#000').text(value, x, y + 9, { width: colW - 8 });
      });
      doc.y = infoStartY + Math.ceil(Math.max(infoFields.length, 1) / 3) * infoRowH + 10;
    };

    const drawTableHeader = (y: number) => {
      let x = left;
      taxCols.forEach((col, ci) => {
        this.drawTableCell(doc, col.label, x, y, col.width, colHeaderH, {
          bold: true, fontSize: ci === 0 ? 7.5 : 7, align: col.align, fill: '#e0e0e0',
        });
        x += col.width;
      });
      return y + colHeaderH;
    };

    for (let ei = 0; ei < employees.length; ei++) {
      const emp = employees[ei];
      const sortedRows = [...emp.rows].sort((a, b) => a.year === b.year ? a.month - b.month : a.year - b.year);


      if (ei > 0) doc.addPage();

      drawEmpHeader(emp);

      let y = drawTableHeader(doc.y);

      let annualGross = 0;
      let annualTax = 0;

      for (let ri = 0; ri < sortedRows.length; ri++) {
        const p = sortedRows[ri];
        const gross = parseAmount(p.grossSalary);
        const tax = parseAmount(p.incomeTax);
        annualGross += gross;
        annualTax += tax;

        const needed = rowH + (ri === sortedRows.length - 1 ? totalsH + notesH : 0);
        if (y + needed > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
          drawEmpHeader(emp);
          y = drawTableHeader(doc.y);
        }

        const fill = ri % 2 === 0 ? undefined : '#fafafa';
        const vals = [`${MONTH_NAMES[p.month - 1]} ${p.year}`, fmt(gross), fmt(tax)];
        let x = left;
        vals.forEach((val, ci) => {
          this.drawTableCell(doc, val, x, y, taxCols[ci].width, rowH, {
            fontSize: 8, align: taxCols[ci].align, fill,
          });
          x += taxCols[ci].width;
        });
        y += rowH;
      }

      // Totals row spanning full width as 3-cell bar
      const annualNet = annualGross - annualTax;
      const totalCells = [
        { label: 'Annual Gross Salary', value: fmt(annualGross), width: pageWidth / 3 },
        { label: 'Annual Tax Deduction', value: fmt(annualTax), width: pageWidth / 3 },
        { label: 'Annual Net Pay', value: fmt(annualNet), width: pageWidth / 3 },
      ];
      let tx = left;
      totalCells.forEach(({ label, value, width }) => {
        doc.rect(tx, y, width, totalsH).fillAndStroke('#d8e8d8', '#000');
        doc.fillColor('#000');
        doc.font('Helvetica-Bold').fontSize(6.5).text(label, tx + 4, y + 3, { width: width - 8 });
        doc.font('Helvetica-Bold').fontSize(9).text(value, tx + 4, y + 12, { width: width - 8, align: 'right' });
        tx += width;
      });
      y += totalsH;

      // Notes
      doc.y = y + 6;
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#000').text('NOTE:', left);
      doc.font('Helvetica').fontSize(6.5);
      notes.forEach((note) => {
        doc.text(`·  ${note}`, left + 8, doc.y, { width: pageWidth - 8 });
      });
    }
  }

  // ─── GP Fund Report ────────────────────────────────────────────────────────

  private async renderGpFundPdf(
    doc: InstanceType<typeof PDFDocument>,
    month: number | undefined,
    year: number | undefined,
    periodLabel: string | undefined,
    genLabel: string,
  ) {
    const years = year ? [year] : undefined;
    const months = month ? [month] : undefined;
    const overview = await this.gpFundOverviewService.getOverview({ years, months });

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    const subtitle = [periodLabel, genLabel].filter(Boolean).join('   |   ');
    const docTitle = 'GP FUND REPORT';

    this.drawPageHeader(doc, docTitle, subtitle);

    // Summary banner
    const { summary } = overview;
    const bannerY = doc.y;
    const bannerH = 28;
    doc.rect(left, bannerY, pageWidth, bannerH).fill('#e8e8e8');
    doc.fillColor('#000');
    const bannerItems = [
      { label: 'Enrolled Employees', value: String(summary.enrolledEmployeeCount) },
      { label: 'Total Base Collected', value: fmt(summary.totalBaseCollected) },
      { label: 'Total Annual Markup', value: fmt(summary.totalAnnualMarkup) },
      { label: 'Total Collected', value: fmt(summary.totalCollected) },
      { label: 'Markup Rate', value: `${summary.annualMarkupRate}%` },
    ];
    const bColW = pageWidth / bannerItems.length;
    bannerItems.forEach(({ label, value }, i) => {
      const x = left + i * bColW;
      doc.font('Helvetica-Bold').fontSize(6).text(label, x + 4, bannerY + 5, { width: bColW - 8 });
      doc.font('Helvetica-Bold').fontSize(8).text(value, x + 4, bannerY + 15, { width: bColW - 8 });
    });
    doc.y = bannerY + bannerH + 6;

    // By-employee table
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000').text('Collection by Employee', left, doc.y);
    doc.moveDown(0.3);

    const cols = [
      { label: '#', width: pageWidth * 0.04, align: 'center' as const },
      { label: 'Employee', width: pageWidth * 0.24, align: 'left' as const },
      { label: 'Designation', width: pageWidth * 0.18, align: 'left' as const },
      { label: 'GP Fund Scale', width: pageWidth * 0.10, align: 'center' as const },
      { label: 'Subscription / Month', width: pageWidth * 0.12, align: 'right' as const },
      { label: 'Payroll Count', width: pageWidth * 0.09, align: 'center' as const },
      { label: 'Base Collected', width: pageWidth * 0.11, align: 'right' as const },
      { label: 'Annual Markup', width: pageWidth * 0.12, align: 'right' as const },
    ];
    const headerH = 24;
    const rowH = 16;

    const drawHeader = (y: number) => {
      let x = left;
      cols.forEach((col) => {
        this.drawTableCell(doc, col.label, x, y, col.width, headerH, {
          bold: true, fontSize: 6.5, align: col.align, fill: '#d0d0d0',
        });
        x += col.width;
      });
      return y + headerH;
    };

    let y = drawHeader(doc.y);

    if (overview.byEmployee.length === 0) {
      this.drawTableCell(doc, 'No GP fund contributions found for the selected period.', left, y, pageWidth, rowH, {
        fontSize: 8, align: 'center',
      });
      doc.y = y + rowH + 10;
      return;
    }

    overview.byEmployee.forEach((emp, idx) => {
      const { y: newY, newPage } = this.checkPageBreak(doc, y, rowH, docTitle, subtitle);
      y = newPage ? drawHeader(newY) : newY;

      const fill = idx % 2 === 0 ? undefined : '#fafafa';
      const vals = [
        String(idx + 1),
        `${emp.name}\n${emp.employeeCode}`,
        emp.designation,
        emp.gpFundScale ?? '—',
        fmt(emp.subscriptionValue),
        String(emp.payrollCount),
        fmt(emp.totalBaseCollected),
        emp.totalAnnualMarkup > 0 ? fmt(emp.totalAnnualMarkup) : '—',
      ];

      let x = left;
      vals.forEach((val, ci) => {
        this.drawTableCell(doc, val, x, y, cols[ci].width, rowH, {
          fontSize: ci === 1 ? 6 : 7, align: cols[ci].align, fill,
        });
        x += cols[ci].width;
      });
      y += rowH;
    });

    // Totals row
    const totalVals = ['', 'TOTAL', '', '', '', '', fmt(summary.totalBaseCollected), fmt(summary.totalAnnualMarkup)];
    let x = left;
    totalVals.forEach((val, ci) => {
      this.drawTableCell(doc, val, x, y, cols[ci].width, rowH, {
        bold: true, fontSize: 7, align: cols[ci].align, fill: '#e8e8e8',
      });
      x += cols[ci].width;
    });
    doc.y = y + rowH + 10;

    // Monthly breakdown
    if (overview.byMonth.length > 0) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#000').text('Monthly Breakdown', left, doc.y);
      doc.moveDown(0.3);

      const mCols = [
        { label: 'Period', width: pageWidth * 0.22, align: 'left' as const },
        { label: 'Employees', width: pageWidth * 0.14, align: 'center' as const },
        { label: 'Payroll Count', width: pageWidth * 0.14, align: 'center' as const },
        { label: 'Base Collected', width: pageWidth * 0.17, align: 'right' as const },
        { label: 'Annual Markup', width: pageWidth * 0.17, align: 'right' as const },
        { label: 'Total Collected', width: pageWidth * 0.16, align: 'right' as const },
      ];
      const mHeaderH = 20;
      const mRowH = 15;

      const drawMHeader = (my: number) => {
        let mx = left;
        mCols.forEach((col) => {
          this.drawTableCell(doc, col.label, mx, my, col.width, mHeaderH, {
            bold: true, fontSize: 7, align: col.align, fill: '#d0d0d0',
          });
          mx += col.width;
        });
        return my + mHeaderH;
      };

      y = drawMHeader(doc.y);

      overview.byMonth.forEach((row, idx) => {
        const { y: newY, newPage } = this.checkPageBreak(doc, y, mRowH, docTitle, subtitle);
        y = newPage ? drawMHeader(newY) : newY;

        const fill = idx % 2 === 0 ? undefined : '#fafafa';
        const mVals = [
          row.label,
          String(row.employeeCount),
          String(row.payrollCount),
          fmt(row.totalBaseCollected),
          row.totalAnnualMarkup > 0 ? fmt(row.totalAnnualMarkup) : '—',
          fmt(row.totalCollected),
        ];

        let mx = left;
        mVals.forEach((val, ci) => {
          this.drawTableCell(doc, val, mx, y, mCols[ci].width, mRowH, {
            fontSize: 7, align: mCols[ci].align, fill,
          });
          mx += mCols[ci].width;
        });
        y += mRowH;
      });

      doc.y = y + 6;
    }
  }

  // ─── Pension Report ────────────────────────────────────────────────────────

  private async renderPensionPdf(
    doc: InstanceType<typeof PDFDocument>,
    month: number | undefined,
    year: number | undefined,
    periodLabel: string | undefined,
    genLabel: string,
  ) {
    const years = year ? [year] : undefined;
    const months = month ? [month] : undefined;
    const overview = await this.pensionOverviewService.getOverview({ years, months });

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    const subtitle = [periodLabel, genLabel].filter(Boolean).join('   |   ');
    const docTitle = 'PENSION CONTRIBUTION REPORT';

    this.drawPageHeader(doc, docTitle, subtitle);

    // Summary banner
    const { summary } = overview;
    const bannerY = doc.y;
    const bannerH = 28;
    doc.rect(left, bannerY, pageWidth, bannerH).fill('#e8e8e8');
    doc.fillColor('#000');
    const bannerItems = [
      { label: 'Total Enrolled', value: String(summary.totalEnrollments) },
      { label: 'Active Enrollments', value: String(summary.activeEnrollments) },
      { label: 'Employees Contributing', value: String(summary.employeeCount) },
      { label: 'Payroll Records', value: String(summary.payrollCount) },
      { label: 'Total Pension Deducted', value: fmt(summary.totalPension) },
    ];
    const bColW = pageWidth / bannerItems.length;
    bannerItems.forEach(({ label, value }, i) => {
      const x = left + i * bColW;
      doc.font('Helvetica-Bold').fontSize(6).text(label, x + 4, bannerY + 5, { width: bColW - 8 });
      doc.font('Helvetica-Bold').fontSize(8).text(value, x + 4, bannerY + 15, { width: bColW - 8 });
    });
    doc.y = bannerY + bannerH + 6;

    if (overview.byEmployee.length === 0) {
      doc.font('Helvetica').fontSize(10).text('No pension contributions found for this period.', left, doc.y);
      return;
    }

    // By-employee table
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000').text('Contributions by Employee', left, doc.y);
    doc.moveDown(0.3);

    const cols = [
      { label: '#', width: pageWidth * 0.05, align: 'center' as const },
      { label: 'Employee', width: pageWidth * 0.22, align: 'left' as const },
      { label: 'Designation', width: pageWidth * 0.16, align: 'left' as const },
      { label: 'Payrolls', width: pageWidth * 0.09, align: 'center' as const },
      { label: 'Employee Pension', width: pageWidth * 0.16, align: 'right' as const },
      { label: 'Employer Pension', width: pageWidth * 0.16, align: 'right' as const },
      { label: 'Total Pension', width: pageWidth * 0.16, align: 'right' as const },
    ];
    const headerH = 22;
    const rowH = 16;

    const drawHeader = (y: number) => {
      let x = left;
      cols.forEach((col) => {
        this.drawTableCell(doc, col.label, x, y, col.width, headerH, {
          bold: true, fontSize: 7, align: col.align, fill: '#d0d0d0',
        });
        x += col.width;
      });
      return y + headerH;
    };

    let y = drawHeader(doc.y);

    overview.byEmployee.forEach((emp, idx) => {
      const { y: newY, newPage } = this.checkPageBreak(doc, y, rowH, docTitle, subtitle);
      y = newPage ? drawHeader(newY) : newY;

      const fill = idx % 2 === 0 ? undefined : '#fafafa';
      const vals = [
        String(idx + 1),
        `${emp.name}\n${emp.employeeCode}`,
        emp.designation,
        String(emp.count),
        fmt(emp.employeePension),
        fmt(emp.employerPension),
        fmt(emp.total),
      ];

      let x = left;
      vals.forEach((val, ci) => {
        this.drawTableCell(doc, val, x, y, cols[ci].width, rowH, {
          fontSize: ci === 1 ? 6 : 7, align: cols[ci].align, fill,
        });
        x += cols[ci].width;
      });
      y += rowH;
    });

    // Totals row
    const totalVals = [
      '',
      'TOTAL',
      '',
      '',
      fmt(summary.totalEmployeePension),
      fmt(summary.totalEmployerPension),
      fmt(summary.totalPension),
    ];
    let x = left;
    totalVals.forEach((val, ci) => {
      this.drawTableCell(doc, val, x, y, cols[ci].width, rowH, {
        bold: true, fontSize: 7, align: cols[ci].align, fill: '#e8e8e8',
      });
      x += cols[ci].width;
    });
    doc.y = y + rowH + 10;

    // Monthly breakdown
    if (overview.byMonth.length > 0) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#000').text('Monthly Breakdown', left, doc.y);
      doc.moveDown(0.3);

      const mCols = [
        { label: 'Period', width: pageWidth * 0.22, align: 'left' as const },
        { label: 'Employees', width: pageWidth * 0.12, align: 'center' as const },
        { label: 'Records', width: pageWidth * 0.12, align: 'center' as const },
        { label: 'Employee Pension', width: pageWidth * 0.18, align: 'right' as const },
        { label: 'Employer Pension', width: pageWidth * 0.18, align: 'right' as const },
        { label: 'Total Pension', width: pageWidth * 0.18, align: 'right' as const },
      ];
      const mHeaderH = 20;
      const mRowH = 15;

      const drawMHeader = (my: number) => {
        let mx = left;
        mCols.forEach((col) => {
          this.drawTableCell(doc, col.label, mx, my, col.width, mHeaderH, {
            bold: true, fontSize: 7, align: col.align, fill: '#d0d0d0',
          });
          mx += col.width;
        });
        return my + mHeaderH;
      };

      y = drawMHeader(doc.y);

      overview.byMonth.forEach((row, idx) => {
        const { y: newY, newPage } = this.checkPageBreak(doc, y, mRowH, docTitle, subtitle);
        y = newPage ? drawMHeader(newY) : newY;

        const fill = idx % 2 === 0 ? undefined : '#fafafa';
        const mVals = [
          row.label,
          String(row.employeeCount),
          String(row.count),
          fmt(row.employeePension),
          fmt(row.employerPension),
          fmt(row.total),
        ];

        let mx = left;
        mVals.forEach((val, ci) => {
          this.drawTableCell(doc, val, mx, y, mCols[ci].width, mRowH, {
            fontSize: 7, align: mCols[ci].align, fill,
          });
          mx += mCols[ci].width;
        });
        y += mRowH;
      });

      doc.y = y + 6;
    }
  }
}
