import { formatAmount } from '../common/utils/currency.utils';
import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ZipArchive, type Archiver } from 'archiver';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { Employee } from '../employees/entities/employee.entity';
import { EmployeesService } from '../employees/employees.service';
import { SALARY_SLIP_LOGOS } from '../payrolls/salary-slip.constants';
import { DownloadGpFundReportsZipDto } from './dto/download-gp-fund-reports-zip.dto';
import { GenerateGpFundReportDto } from './dto/generate-gp-fund-report.dto';
import { GpFundOverviewQueryDto } from './dto/gp-fund-overview-query.dto';
import {
  buildGpFundReportPayload,
  GpFundReportContributionRow,
  GpFundReportPayload,
} from './gp-fund-report.builder';
import { GpFundAdvanceService } from './gp-fund-advance.service';
import { GpFundOverviewService } from './gp-fund-overview.service';

export type GpFundReport = GpFundReportPayload;

export interface GpFundReportAvailabilityResponse {
  rows: GpFundReportAvailability[];
  availableYears: number[];
}

export interface GpFundReportAvailability {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  stage: string;
  designation: string;
  gpFundScale: string | null;
  payrollCount: number;
  totalCollected: number;
  canGenerateReport: boolean;
  message: string;
}

@Injectable()
export class GpFundReportsService {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly gpFundOverviewService: GpFundOverviewService,
    private readonly gpFundAdvanceService: GpFundAdvanceService,
  ) {}

  async getAvailability(query: GpFundOverviewQueryDto): Promise<GpFundReportAvailabilityResponse> {
    const [employees, overview] = await Promise.all([
      this.employeesService.findActiveEmployees(),
      this.gpFundOverviewService.getOverview(query),
    ]);

    const byEmployee = new Map(
      overview.byEmployee.map((row) => [row.employeeId, row]),
    );

    const rows = employees.map((employee) => {
      const stats = byEmployee.get(employee.id);
      const hasScale = !!employee.gpFund?.trim();
      const hasContributions = (stats?.totalCollected ?? 0) > 0;
      const canGenerate = hasScale || hasContributions;

      let message = 'No GP fund scale assigned and no contributions in selected period';
      if (hasContributions) {
        message = 'GP fund report available';
      } else if (hasScale) {
        message = 'GP fund scale assigned — no contributions in selected period';
      }

      return {
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        fullName: employee.name,
        stage: employee.stage ?? '',
        designation: employee.designation,
        gpFundScale: employee.gpFund ?? stats?.gpFundScale ?? null,
        payrollCount: stats?.payrollCount ?? 0,
        totalCollected: stats?.totalCollected ?? 0,
        canGenerateReport: canGenerate,
        message,
      };
    });

    return {
      rows,
      availableYears: overview.availableYears,
    };
  }

  async generate(dto: GenerateGpFundReportDto): Promise<GpFundReport> {
    const employee = await this.employeesService.findOne(dto.employeeId);
    return this.buildReportForEmployee(employee, dto);
  }

  async generatePdf(
    employeeId: number,
    query: GpFundOverviewQueryDto,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const employee = await this.employeesService.findOne(employeeId);
    const report = await this.buildReportForEmployee(employee, query);
    const buffer = await this.renderPdf(report);
    return {
      buffer,
      filename: `${report.reportNumber}.pdf`,
    };
  }

  async resolveDownloadEmployees(dto: DownloadGpFundReportsZipDto): Promise<Employee[]> {
    const overviewQuery: GpFundOverviewQueryDto = {
      years: dto.years,
      months: dto.months,
    };
    const availability = await this.getAvailability(overviewQuery);
    let eligible = availability.rows.filter((row) => row.canGenerateReport);

    if (dto.stage) {
      eligible = eligible.filter((row) => row.stage === dto.stage);
    }

    if (dto.employeeIds?.length) {
      const requested = new Set(dto.employeeIds);
      eligible = eligible.filter((row) => requested.has(row.employeeId));
      if (eligible.length === 0) {
        throw new BadRequestException(
          'No eligible GP fund reports found for the selected employee(s)',
        );
      }
    }

    if (eligible.length === 0) {
      throw new BadRequestException(
        'No GP fund reports available for download for the selected filters',
      );
    }

    const employees = await Promise.all(
      eligible.map((row) => this.employeesService.findOne(row.employeeId)),
    );

    return employees.sort((a, b) => a.name.localeCompare(b.name));
  }

  buildZipFilename(dto: DownloadGpFundReportsZipDto, selected: boolean): string {
    const yearToken = dto.years?.length === 1 ? String(dto.years[0]) : 'all-years';
    if (selected) {
      return `gp-fund-reports-selected-${yearToken}.zip`;
    }
    return `gp-fund-reports-${yearToken}.zip`;
  }

  createZipArchive(): Archiver {
    return new ZipArchive({ zlib: { level: 5 } });
  }

  async appendEmployeesToArchive(
    archive: Archiver,
    employees: Employee[],
    query: GpFundOverviewQueryDto,
  ): Promise<{ added: number; failures: string[] }> {
    const usedNames = new Set<string>();
    let added = 0;
    const failures: string[] = [];

    for (const employee of employees) {
      try {
        const report = await this.buildReportForEmployee(employee, query);
        const buffer = await this.renderPdf(report);
        let filename = `${report.reportNumber}.pdf`;
        let counter = 1;

        while (usedNames.has(filename)) {
          filename = `${report.reportNumber}-${counter}.pdf`;
          counter += 1;
        }

        usedNames.add(filename);
        archive.append(buffer, { name: filename });
        added += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'PDF generation failed';
        failures.push(`${employee.employeeCode}: ${message}`);
      }
    }

    return { added, failures };
  }

  private async buildReportForEmployee(
    employee: Employee,
    query: GpFundOverviewQueryDto,
  ): Promise<GpFundReport> {
    const overview = await this.gpFundOverviewService.getOverview({
      ...query,
      employeeId: employee.id,
    });

    const employeeStats = overview.byEmployee[0];
    const contributions: GpFundReportContributionRow[] = overview.records
      .filter((row) => row.employeeId === employee.id)
      .map((row) => ({
        label: row.label,
        month: row.month,
        year: row.year,
        subscriptionValue: row.subscriptionValue,
        gpFundBaseAmount: row.gpFundBaseAmount,
        monthlyMarkupAmount: row.monthlyMarkupAmount,
        annualMarkupAmount: row.annualMarkupAmount,
        advanceInstallmentAmount: row.advanceInstallmentAmount,
        gpFundAmount: row.gpFundAmount,
      }))
      .sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year));

    const activeAdvance = await this.gpFundAdvanceService.findActiveForEmployee(employee.id);
    const advance = activeAdvance
      ? this.gpFundAdvanceService.mapAdvanceRow(activeAdvance)
      : null;

    const hasScale = !!employee.gpFund?.trim();
    const hasData = (employeeStats?.totalCollected ?? 0) > 0 || contributions.length > 0;
    if (!hasScale && !hasData) {
      throw new BadRequestException(
        'GP fund report cannot be generated — employee has no GP fund scale and no contributions in the selected period',
      );
    }

    return buildGpFundReportPayload({
      employee,
      subscriptionValue: employeeStats?.subscriptionValue ?? 0,
      totalCollected: employeeStats?.totalCollected ?? 0,
      monthlyMarkupRate: overview.summary.monthlyMarkupRate,
      annualMarkupRate: overview.summary.annualMarkupRate,
      contributions,
      advancePayable: advance?.advanceAmount ?? 0,
      advanceRecovered: advance?.amountRepaid ?? 0,
      years: query.years,
      months: query.months,
    });
  }

  private getLogoPath(filename: string): string {
    return path.join(__dirname, '..', 'assets', 'salary-slip', filename);
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
    } = {},
  ) {
    const { bold = false, fontSize = 6.5, align = 'left', fill } = options;
    if (fill) {
      doc.rect(x, y, width, height).fillAndStroke(fill, '#000');
      doc.fillColor('#000');
    } else {
      doc.rect(x, y, width, height).stroke();
    }
    doc
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(fontSize)
      .text(text, x + 3, y + 3, {
        width: width - 6,
        height: height - 6,
        align,
        lineGap: 0,
      });
  }

  private renderPdf(report: GpFundReport): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: 'A4' });
        const chunks: Buffer[] = [];
        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const left = doc.page.margins.left;
        const logoSize = 52;
        const dataRowHeight = 18;
        const headerRowHeight = 30;

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        const headerY = doc.y;
        const leftLogoPath = this.getLogoPath(SALARY_SLIP_LOGOS.left);
        const rightLogoPath = this.getLogoPath(SALARY_SLIP_LOGOS.right);
        if (fs.existsSync(leftLogoPath)) {
          doc.image(leftLogoPath, left, headerY, { fit: [logoSize, logoSize] });
        }
        if (fs.existsSync(rightLogoPath)) {
          doc.image(rightLogoPath, left + pageWidth - logoSize, headerY, {
            fit: [logoSize, logoSize],
          });
        }

        const titleY = headerY + 4;
        doc.font('Helvetica-Bold').fontSize(13).text(report.organization.title, left, titleY, {
          width: pageWidth,
          align: 'center',
        });
        doc.fontSize(11).text(report.organization.subtitle, { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(12).text(report.organization.documentTitle, { align: 'center', underline: true });
        doc.y = Math.max(doc.y, headerY + logoSize + 6);
        doc.moveDown(0.5);

        const colWidth = pageWidth / 3;
        const infoRows = report.employeeInfoFields.map(
          (field) => [field.label, field.value] as [string, string],
        );
        const infoStartY = doc.y;
        infoRows.forEach(([label, value], index) => {
          const col = index % 3;
          const row = Math.floor(index / 3);
          const x = left + col * colWidth;
          const y = infoStartY + row * 26;
          doc.font('Helvetica-Bold').fontSize(7.5).text(`${label}:`, x, y, { width: colWidth - 8 });
          doc.font('Helvetica').fontSize(7.5).text(value, x, y + 9, { width: colWidth - 8 });
        });
        doc.y = infoStartY + Math.ceil(Math.max(infoRows.length, 1) / 3) * 26 + 10;

        const columns: Array<{ label: string; width: number; align: 'left' | 'right' | 'center' }> = [
          { label: 'Sr.\nNo.', width: pageWidth * 0.06, align: 'center' },
          { label: 'Subscription of\nGP Fund per Month', width: pageWidth * 0.13, align: 'right' },
          { label: 'Tenure', width: pageWidth * 0.13, align: 'left' },
          { label: 'Balance\nc/f', width: pageWidth * 0.12, align: 'right' },
          { label: 'Collection\nof GP Fund', width: pageWidth * 0.12, align: 'right' },
          { label: 'Mark-up Rate\nper Anum', width: pageWidth * 0.12, align: 'right' },
          { label: 'GP Fund\nincluding Mark-up', width: pageWidth * 0.12, align: 'right' },
          { label: 'Total Balance\n(Inclusive Mark-UP)', width: pageWidth * 0.20, align: 'right' },
        ];

        let y = doc.y;
        let x = left;
        columns.forEach((column) => {
          this.drawTableCell(doc, column.label, x, y, column.width, headerRowHeight, {
            bold: true,
            fontSize: 5.5,
            align: column.align,
            fill: '#e8e8e8',
          });
          x += column.width;
        });
        y += headerRowHeight;

        const drawFundRow = (values: string[]) => {
          x = left;
          values.forEach((value, index) => {
            this.drawTableCell(doc, value, x, y, columns[index].width, dataRowHeight, {
              align: columns[index].align,
            });
            x += columns[index].width;
          });
          y += dataRowHeight;
        };

        if (report.fundTableRows.length === 0) {
          drawFundRow(['', '', 'No contributions in selected period', '', '', '', '', '']);
        } else {
          for (const row of report.fundTableRows) {
            drawFundRow([
              String(row.srNo),
              formatAmount(row.subscriptionPerMonth),
              row.tenure,
              formatAmount(row.closingBalance),
              formatAmount(row.currentBalance),
              row.collectionRate,
              formatAmount(row.markupAmount),
              formatAmount(row.totalBalanceInclusiveMarkup),
            ]);
          }
        }

        const loanColW = pageWidth / 4;
        const loanHeight = 20;
        const loanCells = [
          { text: 'Loans and Advance', align: 'left' as const },
          { text: `Total Payable: ${formatAmount(report.loanRecovery.totalPayable)}`, align: 'left' as const },
          {
            text: report.loanRecovery.recoveredTill > 0
              ? `Recovered till: ${formatAmount(report.loanRecovery.recoveredTill)}`
              : 'Recovered till:',
            align: 'left' as const,
          },
          {
            text: report.loanRecovery.balancePayable > 0
              ? `Balance Payable: ${formatAmount(report.loanRecovery.balancePayable)}`
              : 'Balance Payable:',
            align: 'left' as const,
          },
        ];
        loanCells.forEach((cell, index) => {
          this.drawTableCell(doc, cell.text, left + index * loanColW, y, loanColW, loanHeight, {
            bold: true,
            fontSize: 6.5,
            align: cell.align,
          });
        });
        y += loanHeight;

        const totalLabelW = columns.slice(0, 6).reduce((sum, col) => sum + col.width, 0);
        const totalValueW = columns.slice(6).reduce((sum, col) => sum + col.width, 0);
        const totalHeight = 20;
        this.drawTableCell(doc, 'Total GPF Balance', left, y, totalLabelW, totalHeight, {
          bold: true,
          fontSize: 7.5,
          align: 'left',
        });
        this.drawTableCell(
          doc,
          formatAmount(report.totalGpfBalance),
          left + totalLabelW,
          y,
          totalValueW,
          totalHeight,
          { bold: true, fontSize: 7.5, align: 'right' },
        );
        y += totalHeight;

        doc.y = y + 8;
        doc.font('Helvetica-Bold').fontSize(8).text('NOTE:', left);
        doc.font('Helvetica').fontSize(7);
        report.notes.forEach((note) => {
          doc.text(`• ${note}`, left, doc.y, { width: pageWidth });
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
