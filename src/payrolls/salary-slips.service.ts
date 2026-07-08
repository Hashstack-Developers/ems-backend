import { formatAmount } from '../common/utils/currency.utils';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ZipArchive, type Archiver } from 'archiver';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { Repository } from 'typeorm';
import { EmployeesService } from '../employees/employees.service';
import { GpFundAdvanceService } from '../gp-fund/gp-fund-advance.service';
import { DownloadSalarySlipsZipDto } from './dto/download-salary-slips-zip.dto';
import { GenerateSalarySlipDto } from './dto/generate-salary-slip.dto';
import { Payroll, PayrollStatus } from './entities/payroll.entity';
import {
  buildSalarySlipPayload,
  SalarySlipLineItem,
  SalarySlipPayload,
  SalarySlipRecoverySection,
} from './salary-slip.builder';
import { SALARY_SLIP_LOGOS } from './salary-slip.constants';

export type SalarySlip = SalarySlipPayload;
export type SalarySlipDeduction = SalarySlipPayload['rawDeductions'][number];

export interface SalarySlipAvailability {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  fatherName: string;
  stage: string;
  designation: string;
  payrollId: number | null;
  payrollStatus: PayrollStatus | null;
  canGenerateSlip: boolean;
  message: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

@Injectable()
export class SalarySlipsService {
  constructor(
    @InjectRepository(Payroll)
    private readonly payrollsRepository: Repository<Payroll>,
    private readonly employeesService: EmployeesService,
    private readonly gpFundAdvanceService: GpFundAdvanceService,
  ) {}

  async getAvailability(month: number, year: number): Promise<SalarySlipAvailability[]> {
    this.validatePeriod(month, year);

    const [employees, payrolls] = await Promise.all([
      this.employeesService.findActiveEmployees(),
      this.payrollsRepository.find({
        where: { month, year },
        relations: { employee: true },
      }),
    ]);

    const payrollByEmployee = new Map(
      payrolls.map((p) => [p.employeeId, p]),
    );

    return employees.map((emp) => {
      const payroll = payrollByEmployee.get(emp.id);
      const canGenerate = this.isPayrollEligible(payroll);

      let message = 'Payroll not processed for this period';
      if (payroll && !canGenerate) {
        message = `Payroll status is "${payroll.status}" — must be processed or paid`;
      } else if (canGenerate) {
        message = 'Salary slip available';
      }

      return {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        fullName: emp.name,
        fatherName: emp.fatherName ?? '',
        stage: emp.stage ?? '',
        designation: emp.designation,
        payrollId: payroll?.id ?? null,
        payrollStatus: payroll?.status ?? null,
        canGenerateSlip: canGenerate,
        message,
      };
    });
  }

  async generate(dto: GenerateSalarySlipDto): Promise<SalarySlip> {
    this.validatePeriod(dto.month, dto.year);
    await this.employeesService.findOne(dto.employeeId);

    const payroll = await this.payrollsRepository.findOne({
      where: {
        employeeId: dto.employeeId,
        month: dto.month,
        year: dto.year,
      },
      relations: { employee: true, deductions: true },
    });

    if (!payroll) {
      throw new NotFoundException(
        `No payroll found for this employee for ${MONTH_NAMES[dto.month - 1]} ${dto.year}. Process payroll first.`,
      );
    }

    if (!this.isPayrollEligible(payroll)) {
      throw new BadRequestException(
        `Salary slip cannot be generated — payroll status is "${payroll.status}". Payroll must be processed or paid.`,
      );
    }

    return this.mapPayrollToSlip(payroll);
  }

  async generatePdf(payrollId: number): Promise<{ buffer: Buffer; filename: string }> {
    const payroll = await this.payrollsRepository.findOne({
      where: { id: payrollId },
      relations: { employee: true, deductions: true },
    });

    if (!payroll) {
      throw new NotFoundException(`Payroll with ID ${payrollId} not found`);
    }

    if (!this.isPayrollEligible(payroll)) {
      throw new BadRequestException(
        `Salary slip cannot be generated — payroll status is "${payroll.status}"`,
      );
    }

    const slip = await this.mapPayrollToSlip(payroll);
    const buffer = await this.renderPdf(slip);
    return {
      buffer,
      filename: `${slip.slipNumber}.pdf`,
    };
  }

  async resolveDownloadPayrolls(dto: DownloadSalarySlipsZipDto): Promise<Payroll[]> {
    this.validatePeriod(dto.month, dto.year);

    const payrolls = await this.payrollsRepository.find({
      where: { month: dto.month, year: dto.year },
      relations: { employee: true, deductions: true },
      order: { employee: { name: 'ASC' } },
    });

    let eligible = payrolls.filter((payroll) => this.isPayrollEligible(payroll));

    if (dto.department) {
      eligible = eligible.filter(
        (payroll) => payroll.employee.stage === dto.department,
      );
    }

    if (dto.payrollIds?.length) {
      const requested = new Set(dto.payrollIds);
      eligible = eligible.filter((payroll) => requested.has(payroll.id));

      if (eligible.length === 0) {
        throw new BadRequestException(
          'No eligible salary slips found for the selected payroll record(s)',
        );
      }
    }

    if (eligible.length === 0) {
      throw new BadRequestException(
        'No salary slips available for download for the selected period',
      );
    }

    return eligible;
  }

  buildZipFilename(month: number, year: number, selected: boolean): string {
    const monthLabel = String(month).padStart(2, '0');
    if (selected) {
      return `salary-slips-selected-${year}-${monthLabel}.zip`;
    }

    const monthName = MONTH_NAMES[month - 1].toLowerCase();
    return `salary-slips-${monthName}-${year}.zip`;
  }

  createZipArchive(): Archiver {
    return new ZipArchive({ zlib: { level: 5 } });
  }

  async appendPayrollsToArchive(
    archive: Archiver,
    payrolls: Payroll[],
  ): Promise<{ added: number; failures: string[] }> {
    const usedNames = new Set<string>();
    let added = 0;
    const failures: string[] = [];

    for (const payroll of payrolls) {
      try {
        if (!payroll.employee) {
          throw new BadRequestException('Employee details are missing for payroll');
        }

        const slip = await this.mapPayrollToSlip(payroll);
        const buffer = await this.renderPdf(slip);
        let filename = `${slip.slipNumber}.pdf`;
        let counter = 1;

        while (usedNames.has(filename)) {
          filename = `${slip.slipNumber}-${counter}.pdf`;
          counter += 1;
        }

        usedNames.add(filename);
        archive.append(buffer, { name: filename });
        added += 1;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'PDF generation failed';
        failures.push(`Payroll ${payroll.id}: ${message}`);
      }
    }

    return { added, failures };
  }

  private async mapPayrollToSlip(payroll: Payroll): Promise<SalarySlip> {
    const advance = await this.gpFundAdvanceService.findActiveForEmployee(payroll.employeeId);
    return buildSalarySlipPayload(payroll, advance);
  }

  private isPayrollEligible(payroll?: Payroll | null): boolean {
    if (!payroll) return false;
    return (
      payroll.status === PayrollStatus.PROCESSED ||
      payroll.status === PayrollStatus.PAID
    );
  }

  private validatePeriod(month: number, year: number): void {
    if (month < 1 || month > 12) {
      throw new BadRequestException('Month must be between 1 and 12');
    }
    if (year < 2000 || year > 2100) {
      throw new BadRequestException('Year must be between 2000 and 2100');
    }
  }

  private getSalarySlipLogoPath(filename: string): string {
    return path.join(__dirname, '..', '..', 'assets', 'salary-slip', filename);
  }

  private formatDeductionAmount(item: SalarySlipLineItem | undefined): string {
    if (!item) return '';
    if (item.label === 'Other' && item.amount <= 0) return '';
    return formatAmount(item.amount);
  }

  private drawPayDeductionTableRow(
    doc: InstanceType<typeof PDFDocument>,
    y: number,
    left: number,
    colWidths: [number, number, number, number],
    rowHeight: number,
    cells: [string, string, string, string],
    bold = false,
  ) {
    let x = left;
    colWidths.forEach((width, index) => {
      doc.rect(x, y, width, rowHeight).stroke();
      const align = index % 2 === 1 ? 'right' : 'left';
      doc
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(bold ? 9 : 8)
        .text(cells[index], x + 4, y + 4, { width: width - 8, align });
      x += width;
    });
  }

  private renderPdf(slip: SalarySlip): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: 'A4' });
        const chunks: Buffer[] = [];
        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const left = doc.page.margins.left;
        const logoSize = 52;

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        const headerY = doc.y;
        const leftLogoPath = this.getSalarySlipLogoPath(SALARY_SLIP_LOGOS.left);
        const rightLogoPath = this.getSalarySlipLogoPath(SALARY_SLIP_LOGOS.right);

        if (fs.existsSync(leftLogoPath)) {
          doc.image(leftLogoPath, left, headerY, { fit: [logoSize, logoSize] });
        }
        if (fs.existsSync(rightLogoPath)) {
          doc.image(rightLogoPath, left + pageWidth - logoSize, headerY, {
            fit: [logoSize, logoSize],
          });
        }

        const titleY = headerY + 4;
        doc.font('Helvetica-Bold').fontSize(13).text(slip.organization.title, left, titleY, {
          width: pageWidth,
          align: 'center',
        });
        doc.fontSize(11).text(slip.organization.subtitle, { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(12).text(slip.organization.documentTitle, { align: 'center', underline: true });
        doc.y = Math.max(doc.y, headerY + logoSize + 6);
        doc.moveDown(0.4);

        doc.font('Helvetica').fontSize(9);
        doc.text(`Dated: ${slip.dated}`, left, doc.y, { width: pageWidth / 2 });
        doc.text(`For the Month of ${slip.period.year}: ${MONTH_NAMES[slip.period.month - 1]}`, {
          width: pageWidth,
          align: 'right',
        });
        doc.moveDown(0.6);

        const colWidth = pageWidth / 3;
        const infoRows = slip.employeeInfoFields.map(
          (field) => [field.label, field.value] as [string, string],
        );

        const startY = doc.y;
        infoRows.forEach(([label, value], index) => {
          const col = index % 3;
          const row = Math.floor(index / 3);
          const x = left + col * colWidth;
          const y = startY + row * 28;
          doc.font('Helvetica-Bold').fontSize(8).text(`${label}:`, x, y, { width: colWidth - 8 });
          doc.font('Helvetica').fontSize(8).text(value, x, y + 10, { width: colWidth - 8 });
        });
        doc.y = startY + Math.ceil(Math.max(infoRows.length, 1) / 3) * 28 + 8;

        const tableTop = doc.y;
        const half = pageWidth / 2;
        const labelColW = half * 0.72;
        const amountColW = half * 0.28;
        const colWidths: [number, number, number, number] = [
          labelColW,
          amountColW,
          labelColW,
          amountColW,
        ];
        const rowHeight = 16;

        this.drawPayDeductionTableRow(
          doc,
          tableTop,
          left,
          colWidths,
          rowHeight,
          ['Pay & Allowances', 'Amount (Rs.)', 'Deductions', 'Amounts (Rs.)'],
          true,
        );

        const maxRows = Math.max(slip.allowances.length, slip.deductions.length, 1);
        let y = tableTop + rowHeight;
        for (let i = 0; i < maxRows; i += 1) {
          const allowance = slip.allowances[i];
          const deduction = slip.deductions[i];
          this.drawPayDeductionTableRow(
            doc,
            y,
            left,
            colWidths,
            rowHeight,
            [
              allowance?.label ?? '',
              allowance ? formatAmount(allowance.amount) : '',
              deduction?.label ?? '',
              this.formatDeductionAmount(deduction),
            ],
          );
          y += rowHeight;
        }

        doc.y = y + 8;
        this.drawRecoveryTable(doc, slip.loanRecovery, left, pageWidth);
        this.drawRecoveryTable(doc, slip.taxRecovery, left, pageWidth);

        const summaryY = doc.y + 4;
        const summaryCols = pageWidth / 3;
        doc.rect(left, summaryY, pageWidth, rowHeight).stroke();
        doc.font('Helvetica-Bold').fontSize(9)
          .text(`Gross Salary: ${formatAmount(slip.summary.grossSalary)}`, left + 4, summaryY + 4, { width: summaryCols - 8 })
          .text(`Deduction: ${formatAmount(slip.summary.totalDeductions)}`, left + summaryCols + 4, summaryY + 4, { width: summaryCols - 8, align: 'center' })
          .text(`Net Pay: ${formatAmount(slip.summary.netSalary)}`, left + summaryCols * 2 + 4, summaryY + 4, { width: summaryCols - 8, align: 'right' });
        doc.y = summaryY + rowHeight + 10;

        doc.font('Helvetica-Bold').fontSize(8).text('NOTE', left);
        doc.font('Helvetica').fontSize(7);
        slip.notes.forEach((note) => {
          doc.text(`• ${note}`, left, doc.y, { width: pageWidth });
        });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private drawRecoveryTable(
    doc: InstanceType<typeof PDFDocument>,
    section: SalarySlipRecoverySection | null,
    left: number,
    pageWidth: number,
  ) {
    if (!section) return;
    const rowHeight = 16;
    const y = doc.y;
    doc.rect(left, y, pageWidth, rowHeight).stroke();
    doc.font('Helvetica-Bold').fontSize(8).text(section.title, left + 4, y + 4);
    doc.y = y + rowHeight;

    const colW = pageWidth / 3;
    const labels = ['Payable', 'Recovered till', 'Recoverable'];
    const values = [
      formatAmount(section.payable),
      formatAmount(section.recoveredTill),
      formatAmount(section.recoverable),
    ];
    const rowY = doc.y;
    labels.forEach((label, index) => {
      const x = left + index * colW;
      doc.rect(x, rowY, colW, rowHeight * 2).stroke();
      doc.font('Helvetica-Bold').fontSize(7).text(label, x + 4, rowY + 4, { width: colW - 8, align: 'center' });
      doc.font('Helvetica').fontSize(8).text(values[index], x + 4, rowY + rowHeight + 2, { width: colW - 8, align: 'center' });
    });
    doc.y = rowY + rowHeight * 2 + 6;
  }
}
