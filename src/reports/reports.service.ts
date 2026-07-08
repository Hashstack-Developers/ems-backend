import { BadRequestException, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';
import { formatAmount, parseAmount } from '../common/utils/currency.utils';
import { Employee } from '../employees/entities/employee.entity';
import { EmployeesService } from '../employees/employees.service';
import { getEmployeeFullName } from '../employees/employee.utils';
import { GpFundOverviewService } from '../gp-fund/gp-fund-overview.service';
import { Payroll } from '../payrolls/entities/payroll.entity';
import { PayrollsService } from '../payrolls/payrolls.service';
import { SALARY_SLIP_BANK, SALARY_SLIP_LOGOS } from '../payrolls/salary-slip.constants';
import { SALARY_SLIP_ALLOWANCE_FIELDS } from '../payrolls/salary-slip.fields';
import { TaxSlabsService } from '../tax-slabs/tax-slabs.service';
import {
  GP_FUND_ADVANCE_CODE,
  GP_FUND_ANNUAL_MARKUP_CODE,
  GP_FUND_DEDUCTION_CODE,
  GP_FUND_MONTHLY_MARKUP_CODE,
} from '../gp-fund/gp-fund.utils';

export type ReportType = 'employees' | 'payrolls' | 'taxes' | 'gpFund';
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
  ) {}

  async generate(
    type: ReportType,
    format: ReportFormat,
    month?: number,
    year?: number,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    if (!['employees', 'payrolls', 'taxes', 'gpFund'].includes(type)) {
      throw new BadRequestException('Invalid report type. Use employees, payrolls, taxes, or gpFund');
    }
    if (!['csv', 'pdf'].includes(format)) {
      throw new BadRequestException('Invalid format. Use csv or pdf');
    }

    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      const { csv, filename } = await this.generateCsv(type, month, year, timestamp);
      return { buffer: Buffer.from(csv, 'utf-8'), filename, contentType: 'text/csv' };
    }

    const { buffer, filename } = await this.generatePdf(type, month, year, timestamp);
    return { buffer, filename, contentType: 'application/pdf' };
  }

  // ─── CSV ───────────────────────────────────────────────────────────────────

  private async generateCsv(
    type: ReportType,
    month: number | undefined,
    year: number | undefined,
    timestamp: string,
  ) {
    let data: Record<string, unknown>[] = [];
    let filename = '';

    switch (type) {
      case 'employees': {
        const employees = await this.employeesService.findAll();
        data = employees.map((e) => ({
          'Employee Code': e.employeeCode,
          'Sr. No.': e.srNo ?? '',
          'Full Name': e.name,
          "Father's Name": e.fatherName ?? '',
          'CNIC No.': e.cnicNo ?? '',
          'Mobile': e.mobile ?? '',
          'Email': e.email,
          'Address': e.address ?? '',
          'Designation': e.designation,
          'Basic Pay Scale (BPS)': e.basicPayScale ?? '',
          'Stage': e.stage ?? '',
          'Religion': e.religion ?? '',
          'Disability': e.disability ?? '',
          'Employment Type': e.employmentType ?? '',
          'Date of Birth': e.dateOfBirth ?? '',
          'Date of Joining': e.dateOfJoining,
          'Date of Regularization': e.dateOfRegularization ?? '',
          'Contract Expiry Date': e.contractExpiryDate ?? '',
          'Date of Retirement': e.dateOfRetirement ?? '',
          'Length of Service': e.lengthOfService ?? '',
          'Status': e.status,
          'Basic Pay (Dec 2025)': Number(e.basicPayDec2025 ?? 0),
          'Basic Pay (Jul 2026)': Number(e.basicPayJul2026 ?? 0),
          'Personal Allowance': Number(e.personalAllowance ?? 0),
          'House Rent Allowance': Number(e.hr ?? 0),
          'Conveyance Allowance': Number(e.ca ?? 0),
          'Medical Allowance': Number(e.ma ?? 0),
          'Ad-hoc Allowance 2022': Number(e.adHocAllowance2022 ?? 0),
          'Ad-hoc Allowance 2023': Number(e.adHocAllowance2023 ?? 0),
          'Ad-hoc Allowance 2024': Number(e.adHocAllowance2024 ?? 0),
          'Ad-hoc Allowance 2025': Number(e.adHocAllowance2025 ?? 0),
          'Ad-hoc Allowance 2026': Number(e.adHocAllowance2026 ?? 0),
          'Special Pay': Number(e.specialPay ?? 0),
          'Personal Pay': Number(e.personalPay ?? 0),
          'Overtime Allowance': Number(e.overtimeAllowance ?? 0),
          'Integrated Allowance': Number(e.integratedAllowance ?? 0),
          'Washing Allowance': Number(e.wa ?? 0),
          'Computer Allowance': Number(e.computerAllowance ?? 0),
          'Special Allowance': Number(e.specialAllowance ?? 0),
          'Mphil / Special Allowance': Number(e.mphilSpecialAllowance ?? 0),
          'Social Security Benefit': Number(e.socialSecurityBenefit ?? 0),
          'Arrears': Number(e.arrears ?? 0),
          'Gross Salary': Number(e.grossSalary ?? 0),
          'Gross Salary With Taxes': Number(e.grossSalaryWithTaxes ?? 0),
          'GP Fund Scale': e.gpFund ?? '',
          'Previously Collected GP Fund': Number(e.previouslyCollectedGpFund ?? 0),
          'GPF Account Number': e.gpfAccountNumber ?? '',
          'Nominee Name': e.nomineeName ?? '',
          'Nominee Relation': e.nomineeRelation ?? '',
          'Loan / Advance': Number(e.loanAdvance ?? 0),
          'Other Deduction': Number(e.deduction ?? 0),
          'Net Payable': Number(e.netPayable ?? 0),
          'Bank Name': SALARY_SLIP_BANK.name,
          'Bank Branch': SALARY_SLIP_BANK.branch,
          'Branch Code': SALARY_SLIP_BANK.branchCode,
          'Account Number': e.accountNumber ?? '',
        }));
        filename = `employees-report-${timestamp}.csv`;
        break;
      }
      case 'payrolls': {
        const payrolls = await this.payrollsService.findAll(month, year);
        data = payrolls.map((p) => {
          const gpFund = this.getDeductionSum(p, [GP_FUND_DEDUCTION_CODE, GP_FUND_MONTHLY_MARKUP_CODE, GP_FUND_ANNUAL_MARKUP_CODE]);
          const advance = this.getDeductionSum(p, [GP_FUND_ADVANCE_CODE]);
          const subTaxes = (p.deductions ?? [])
            .filter((d) => d.category === 'sub_tax')
            .reduce((s, d) => s + parseAmount(d.amount), 0);
          return {
            'Employee Code': p.employee?.employeeCode ?? '',
            'Employee Name': p.employee ? getEmployeeFullName(p.employee) : '',
            'Designation': p.employee?.designation ?? '',
            'Stage': p.employee?.stage ?? '',
            'Month': p.month,
            'Year': p.year,
            'Period': `${MONTH_NAMES[p.month - 1]} ${p.year}`,
            'Gross Salary': Number(p.grossSalary),
            'Tax Slab': p.taxSlabName ?? '',
            'Applied Tax Rate': p.appliedTaxRate != null ? `${Number(p.appliedTaxRate)}%` : '',
            'Income Tax': Number(p.incomeTax),
            'Sub-Tax Deductions': Math.round(subTaxes * 100) / 100,
            'GP Fund Deduction': Math.round(gpFund * 100) / 100,
            'GP Fund Advance': Math.round(advance * 100) / 100,
            'Total Deductions': Number(p.totalDeductions),
            'Net Salary': Number(p.netSalary),
            'Salary Days': p.salaryDays ?? '',
            'Status': p.status,
          };
        });
        filename = `payrolls-report-${timestamp}.csv`;
        break;
      }
      case 'taxes': {
        const [slabs, payrolls] = await Promise.all([
          this.taxSlabsService.findAllTaxSlabs(),
          this.payrollsService.findAll(month, year),
        ]);
        const slabRows = slabs.flatMap((s) => [
          {
            'Category': 'Tax Slab',
            'Slab Name': s.name,
            'Name': s.name,
            'Code': '',
            'Min Salary': Number(s.minSalary),
            'Max Salary': s.maxSalary ? Number(s.maxSalary) : 'Unlimited',
            'Rate / Formula': this.taxSlabsService.formatSlabTaxSummary(s),
            'Status': s.isActive ? 'Active' : 'Inactive',
          },
          ...(s.subTaxes ?? []).map((st) => ({
            'Category': 'Sub-Tax',
            'Slab Name': s.name,
            'Name': st.name,
            'Code': st.code,
            'Min Salary': '',
            'Max Salary': '',
            'Rate / Formula': st.type === 'percentage' ? `${Number(st.rate)}%` : `Fixed ${Number(st.amount)}`,
            'Status': st.isActive ? 'Active' : 'Inactive',
          })),
        ]);
        const payrollRows = payrolls.map((p) => ({
          'Category': 'Payroll Deduction',
          'Slab Name': p.taxSlabName ?? '',
          'Name': p.employee ? getEmployeeFullName(p.employee) : '',
          'Code': p.employee?.employeeCode ?? '',
          'Min Salary': Number(p.grossSalary),
          'Max Salary': '',
          'Rate / Formula': p.appliedTaxRate != null ? `${Number(p.appliedTaxRate)}%` : '',
          'Status': `${MONTH_NAMES[p.month - 1]} ${p.year}`,
          'Income Tax': Number(p.incomeTax),
          'Total Deductions': Number(p.totalDeductions),
          'Net Salary': Number(p.netSalary),
        }));
        data = [...slabRows, ...payrollRows];
        filename = `taxes-report-${timestamp}.csv`;
        break;
      }
      case 'gpFund': {
        const years = year ? [year] : undefined;
        const months = month ? [month] : undefined;
        const overview = await this.gpFundOverviewService.getOverview({ years, months });
        data = overview.byEmployee.map((emp) => ({
          'Employee Code': emp.employeeCode,
          'Employee Name': emp.name,
          'Designation': emp.designation,
          'GP Fund Scale': emp.gpFundScale ?? '',
          'Subscription Value': emp.subscriptionValue,
          'Payroll Count': emp.payrollCount,
          'Base Collected': emp.totalBaseCollected,
          'Annual Markup': emp.totalAnnualMarkup,
          'Total Collected': emp.totalCollected,
        }));
        if (data.length === 0) {
          data = [{ 'Message': 'No GP fund contributions found for the selected period' }];
        }
        filename = `gp-fund-report-${timestamp}.csv`;
        break;
      }
    }

    const parser = new Parser();
    const csv = data.length > 0 ? parser.parse(data) : 'No data available';
    return { csv, filename };
  }

  // ─── PDF core helpers ──────────────────────────────────────────────────────

  private getLogoPath(filename: string): string {
    return path.join(__dirname, '..', '..', 'assets', 'salary-slip', filename);
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
      { label: '#', width: pageWidth * 0.04, align: 'center' as const },
      { label: 'Employee', width: pageWidth * 0.22, align: 'left' as const },
      { label: 'Designation / Stage', width: pageWidth * 0.14, align: 'left' as const },
      { label: 'Tax Slab', width: pageWidth * 0.12, align: 'left' as const },
      { label: 'Gross', width: pageWidth * 0.10, align: 'right' as const },
      { label: 'Income Tax', width: pageWidth * 0.10, align: 'right' as const },
      { label: 'GP Fund', width: pageWidth * 0.09, align: 'right' as const },
      { label: 'Other Ded.', width: pageWidth * 0.09, align: 'right' as const },
      { label: 'Net Salary', width: pageWidth * 0.10, align: 'right' as const },
    ];
    const headerH = 24;
    const rowH = 18;
    const docTitle = 'PAYROLLS REPORT';

    const drawTableHeader = (y: number) => {
      let x = left;
      cols.forEach((col) => {
        this.drawTableCell(doc, col.label, x, y, col.width, headerH, {
          bold: true, fontSize: 6.5, align: col.align, fill: '#d0d0d0',
        });
        x += col.width;
      });
      return y + headerH;
    };

    let y = drawTableHeader(doc.y);

    payrolls.forEach((p, idx) => {
      const { y: newY, newPage } = this.checkPageBreak(doc, y, rowH, docTitle, subtitle);
      y = newPage ? drawTableHeader(newY) : newY;

      const gpFund = this.getDeductionSum(p, [GP_FUND_DEDUCTION_CODE, GP_FUND_MONTHLY_MARKUP_CODE, GP_FUND_ANNUAL_MARKUP_CODE]);
      const advance = this.getDeductionSum(p, [GP_FUND_ADVANCE_CODE]);
      const gpTotal = gpFund + advance;
      const subTax = (p.deductions ?? []).filter((d) => d.category === 'sub_tax').reduce((s, d) => s + parseAmount(d.amount), 0);
      const otherDed = parseAmount(p.totalDeductions) - parseAmount(p.incomeTax) - subTax - gpTotal;
      const slabRate = p.appliedTaxRate != null ? ` (${Number(p.appliedTaxRate)}%)` : '';
      const fill = idx % 2 === 0 ? undefined : '#fafafa';

      const rowVals = [
        String(idx + 1),
        `${p.employee?.name ?? ''}\n${p.employee?.employeeCode ?? ''}`,
        `${p.employee?.designation ?? ''}\n${p.employee?.stage ?? ''}`,
        `${p.taxSlabName ?? '—'}${slabRate}`,
        fmt(p.grossSalary),
        fmt(p.incomeTax),
        gpTotal > 0 ? fmt(gpTotal) : '—',
        otherDed > 0 ? fmt(otherDed) : '—',
        fmt(p.netSalary),
      ];

      let x = left;
      rowVals.forEach((val, ci) => {
        this.drawTableCell(doc, val, x, y, cols[ci].width, rowH, {
          fontSize: ci === 1 || ci === 2 ? 6 : 7, align: cols[ci].align, fill,
        });
        x += cols[ci].width;
      });
      y += rowH;
    });

    const totalVals = ['', 'TOTAL', '', '', fmt(summary.totalGross), '', '', fmt(summary.totalDeductions), fmt(summary.totalNet)];
    let x = left;
    totalVals.forEach((val, ci) => {
      this.drawTableCell(doc, val, x, y, cols[ci].width, rowH, {
        bold: true, fontSize: 7, align: cols[ci].align, fill: '#e8e8e8',
      });
      x += cols[ci].width;
    });

    doc.y = y + rowH + 6;
    doc.font('Helvetica').fontSize(7).fillColor('#555')
      .text('* GP Fund includes base deduction, advance installment, and annual markup (June only).', left, doc.y);
  }

  // ─── Taxes Report ─────────────────────────────────────────────────────────

  private async renderTaxesPdf(
    doc: InstanceType<typeof PDFDocument>,
    month: number | undefined,
    year: number | undefined,
    periodLabel: string | undefined,
    genLabel: string,
  ) {
    const [slabs, payrolls] = await Promise.all([
      this.taxSlabsService.findAllTaxSlabs(),
      this.payrollsService.findAll(month, year),
    ]);
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    const subtitle = [periodLabel, genLabel].filter(Boolean).join('   |   ');
    this.drawPageHeader(doc, 'TAXES REPORT', subtitle);

    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000').text('Tax Slab Configuration', left, doc.y);
    doc.moveDown(0.3);

    const slabCols = [
      { label: 'Tax Slab Name', width: pageWidth * 0.25, align: 'left' as const },
      { label: 'Min Salary', width: pageWidth * 0.14, align: 'right' as const },
      { label: 'Max Salary', width: pageWidth * 0.14, align: 'right' as const },
      { label: 'Rate / Formula', width: pageWidth * 0.30, align: 'left' as const },
      { label: 'Status', width: pageWidth * 0.17, align: 'center' as const },
    ];
    const slabHeaderH = 20;
    const slabRowH = 16;
    const docTitle = 'TAXES REPORT';

    const drawSlabHeader = (y: number) => {
      let x = left;
      slabCols.forEach((col) => {
        this.drawTableCell(doc, col.label, x, y, col.width, slabHeaderH, {
          bold: true, fontSize: 7, align: col.align, fill: '#d0d0d0',
        });
        x += col.width;
      });
      return y + slabHeaderH;
    };

    let y = drawSlabHeader(doc.y);

    slabs.forEach((slab, si) => {
      const { y: newY, newPage } = this.checkPageBreak(doc, y, slabRowH, docTitle, subtitle);
      y = newPage ? drawSlabHeader(newY) : newY;

      const fill = si % 2 === 0 ? undefined : '#fafafa';
      const vals = [
        slab.name,
        fmt(slab.minSalary),
        slab.maxSalary ? fmt(slab.maxSalary) : 'Unlimited',
        this.taxSlabsService.formatSlabTaxSummary(slab),
        slab.isActive ? 'Active' : 'Inactive',
      ];
      let x = left;
      vals.forEach((val, ci) => {
        this.drawTableCell(doc, val, x, y, slabCols[ci].width, slabRowH, {
          fontSize: 7, align: slabCols[ci].align, fill,
          textColor: ci === 4 ? (slab.isActive ? '#1a6b1a' : '#8b1a1a') : '#000',
        });
        x += slabCols[ci].width;
      });
      y += slabRowH;

      (slab.subTaxes ?? []).forEach((st) => {
        const { y: sy, newPage: snp } = this.checkPageBreak(doc, y, slabRowH, docTitle, subtitle);
        y = snp ? drawSlabHeader(sy) : sy;
        const stRate = st.type === 'percentage' ? `${Number(st.rate)}%` : `Fixed ${fmt(st.amount)}`;
        const stVals = [`  └ ${st.name} (${st.code})`, '—', '—', stRate, st.isActive ? 'Active' : 'Inactive'];
        let sx = left;
        stVals.forEach((val, ci) => {
          this.drawTableCell(doc, val, sx, y, slabCols[ci].width, slabRowH, {
            fontSize: 6.5, align: slabCols[ci].align, fill: '#f7f7f7',
            textColor: ci === 4 ? (st.isActive ? '#1a6b1a' : '#8b1a1a') : '#555',
          });
          sx += slabCols[ci].width;
        });
        y += slabRowH;
      });
    });

    doc.y = y + 10;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000').text('Applied Tax Deductions', left, doc.y);
    doc.moveDown(0.3);

    if (payrolls.length === 0) {
      doc.font('Helvetica').fontSize(8).text('No payroll data for selected period.', left, doc.y);
      return;
    }

    const totalIncomeTax = payrolls.reduce((s, p) => s + parseAmount(p.incomeTax), 0);
    const totalSubTax = payrolls.reduce((s, p) => s + (p.deductions ?? []).filter((d) => d.category === 'sub_tax').reduce((ss, d) => ss + parseAmount(d.amount), 0), 0);

    const bannerY = doc.y;
    const bannerH = 26;
    doc.rect(left, bannerY, pageWidth, bannerH).fill('#e8e8e8');
    doc.fillColor('#000');
    const bItems = [
      { label: 'Employees', value: String(payrolls.length) },
      { label: 'Total Income Tax', value: fmt(totalIncomeTax) },
      { label: 'Total Sub-Tax', value: fmt(totalSubTax) },
      { label: 'Total Deductions', value: fmt(payrolls.reduce((s, p) => s + parseAmount(p.totalDeductions), 0)) },
    ];
    const bColW = pageWidth / bItems.length;
    bItems.forEach(({ label, value }, i) => {
      const x = left + i * bColW;
      doc.font('Helvetica-Bold').fontSize(6).text(label, x + 4, bannerY + 4, { width: bColW - 8 });
      doc.font('Helvetica-Bold').fontSize(8).text(value, x + 4, bannerY + 13, { width: bColW - 8 });
    });
    doc.y = bannerY + bannerH + 4;

    const taxCols = [
      { label: '#', width: pageWidth * 0.04, align: 'center' as const },
      { label: 'Employee', width: pageWidth * 0.22, align: 'left' as const },
      { label: 'Tax Slab', width: pageWidth * 0.18, align: 'left' as const },
      { label: 'Gross Salary', width: pageWidth * 0.12, align: 'right' as const },
      { label: 'Income Tax', width: pageWidth * 0.12, align: 'right' as const },
      { label: 'Sub-Tax', width: pageWidth * 0.12, align: 'right' as const },
      { label: 'GP Fund', width: pageWidth * 0.10, align: 'right' as const },
      { label: 'Net Salary', width: pageWidth * 0.10, align: 'right' as const },
    ];
    const tHeaderH = 22;
    const tRowH = 16;

    const drawTaxHeader = (ty: number) => {
      let x = left;
      taxCols.forEach((col) => {
        this.drawTableCell(doc, col.label, x, ty, col.width, tHeaderH, {
          bold: true, fontSize: 7, align: col.align, fill: '#d0d0d0',
        });
        x += col.width;
      });
      return ty + tHeaderH;
    };

    y = drawTaxHeader(doc.y);

    payrolls.forEach((p, idx) => {
      const { y: newY, newPage } = this.checkPageBreak(doc, y, tRowH, docTitle, subtitle);
      y = newPage ? drawTaxHeader(newY) : newY;

      const gpFund = this.getDeductionSum(p, [GP_FUND_DEDUCTION_CODE, GP_FUND_MONTHLY_MARKUP_CODE, GP_FUND_ANNUAL_MARKUP_CODE, GP_FUND_ADVANCE_CODE]);
      const subTax = (p.deductions ?? []).filter((d) => d.category === 'sub_tax').reduce((s, d) => s + parseAmount(d.amount), 0);
      const slabRate = p.appliedTaxRate != null ? ` (${Number(p.appliedTaxRate)}%)` : '';
      const fill = idx % 2 === 0 ? undefined : '#fafafa';

      const vals = [
        String(idx + 1),
        `${p.employee?.name ?? ''}\n${p.employee?.employeeCode ?? ''}`,
        `${p.taxSlabName ?? '—'}${slabRate}`,
        fmt(p.grossSalary),
        fmt(p.incomeTax),
        subTax > 0 ? fmt(subTax) : '—',
        gpFund > 0 ? fmt(gpFund) : '—',
        fmt(p.netSalary),
      ];

      let x = left;
      vals.forEach((val, ci) => {
        this.drawTableCell(doc, val, x, y, taxCols[ci].width, tRowH, {
          fontSize: ci <= 1 ? 6 : 7, align: taxCols[ci].align, fill,
        });
        x += taxCols[ci].width;
      });
      y += tRowH;
    });

    const tTotalVals = ['', 'TOTAL', '',
      fmt(payrolls.reduce((s, p) => s + parseAmount(p.grossSalary), 0)),
      fmt(totalIncomeTax), fmt(totalSubTax), '',
      fmt(payrolls.reduce((s, p) => s + parseAmount(p.netSalary), 0)),
    ];
    let x = left;
    tTotalVals.forEach((val, ci) => {
      this.drawTableCell(doc, val, x, y, taxCols[ci].width, tRowH, {
        bold: true, fontSize: 7, align: taxCols[ci].align, fill: '#e8e8e8',
      });
      x += taxCols[ci].width;
    });
    doc.y = y + tRowH + 6;
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
}
