import { BadRequestException, Injectable } from '@nestjs/common';
import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';
import { EmployeesService } from '../employees/employees.service';
import { getEmployeeFullName } from '../employees/employee.utils';
import { PayrollsService } from '../payrolls/payrolls.service';
import { TaxSlabsService } from '../tax-slabs/tax-slabs.service';

export type ReportType = 'employees' | 'payrolls' | 'taxes';
export type ReportFormat = 'csv' | 'pdf';

@Injectable()
export class ReportsService {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly payrollsService: PayrollsService,
    private readonly taxSlabsService: TaxSlabsService,
  ) {}

  async generate(
    type: ReportType,
    format: ReportFormat,
    month?: number,
    year?: number,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    if (!['employees', 'payrolls', 'taxes'].includes(type)) {
      throw new BadRequestException(
        'Invalid report type. Use employees, payrolls, or taxes',
      );
    }
    if (!['csv', 'pdf'].includes(format)) {
      throw new BadRequestException('Invalid format. Use csv or pdf');
    }

    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      const { csv, filename } = await this.generateCsv(type, month, year, timestamp);
      return {
        buffer: Buffer.from(csv, 'utf-8'),
        filename,
        contentType: 'text/csv',
      };
    }

    const { buffer, filename } = await this.generatePdf(type, month, year, timestamp);
    return {
      buffer,
      filename,
      contentType: 'application/pdf',
    };
  }

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
          employeeCode: e.employeeCode,
          name: e.name,
          email: e.email,
          mobile: e.mobile,
          stage: e.stage,
          designation: e.designation,
          grossSalary: Number(e.grossSalary ?? 0),
          dateOfJoining: e.dateOfJoining,
          status: e.status,
        }));
        filename = `employees-report-${timestamp}.csv`;
        break;
      }
      case 'payrolls': {
        const payrolls = await this.payrollsService.findAll(month, year);
        data = payrolls.map((p) => ({
          employeeCode: p.employee?.employeeCode,
          employeeName: p.employee ? getEmployeeFullName(p.employee) : '',
          month: p.month,
          year: p.year,
          grossSalary: Number(p.grossSalary),
          taxSlab: p.taxSlabName,
          appliedTaxRate: p.appliedTaxRate != null ? `${Number(p.appliedTaxRate)}%` : '-',
          incomeTax: Number(p.incomeTax),
          totalDeductions: Number(p.totalDeductions),
          netSalary: Number(p.netSalary),
          deductionSnapshot: (p.deductions ?? [])
            .map((d) => {
              const rate =
                d.calculationType === 'percentage' && d.appliedRate != null
                  ? `${Number(d.appliedRate)}%`
                  : d.calculationType === 'fixed' && d.appliedFixedAmount != null
                    ? `fixed ${Number(d.appliedFixedAmount)}`
                    : '';
              return `${d.code}${rate ? `(${rate})` : ''}=${Number(d.amount)}`;
            })
            .join('; '),
          status: p.status,
        }));
        filename = `payrolls-report-${timestamp}.csv`;
        break;
      }
      case 'taxes': {
        const [slabs, payrolls] = await Promise.all([
          this.taxSlabsService.findAllTaxSlabs(),
          this.payrollsService.findAll(month, year),
        ]);

        data = [
          ...slabs.flatMap((s) => [
            {
              category: 'Tax Slab',
              slab: s.name,
              name: s.name,
              code: '-',
              minSalary: Number(s.minSalary),
              maxSalary: s.maxSalary ? Number(s.maxSalary) : 'Unlimited',
              rate: this.taxSlabsService.formatSlabTaxSummary(s),
              isActive: s.isActive,
            },
            ...(s.subTaxes ?? []).map((st) => ({
              category: 'Sub-Tax',
              slab: s.name,
              name: st.name,
              code: st.code,
              minSalary: '-',
              maxSalary: '-',
              rate:
                st.type === 'percentage'
                  ? `${Number(st.rate)}%`
                  : `Fixed ${Number(st.amount)}`,
              isActive: st.isActive,
            })),
          ]),
          ...payrolls.map((p) => ({
            category: 'Payroll Deduction',
            name: p.employee ? getEmployeeFullName(p.employee) : '',
            code: p.employee?.employeeCode,
            minSalary: Number(p.grossSalary),
            maxSalary: Number(p.incomeTax),
            rate: Number(p.totalDeductions),
            isActive: `${p.month}/${p.year}`,
          })),
        ];
        filename = `taxes-report-${timestamp}.csv`;
        break;
      }
    }

    const parser = new Parser();
    const csv = data.length > 0 ? parser.parse(data) : 'No data available';
    return { csv, filename };
  }

  private async generatePdf(
    type: ReportType,
    month: number | undefined,
    year: number | undefined,
    timestamp: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => {
          resolve({
            buffer: Buffer.concat(chunks),
            filename: `${type}-report-${timestamp}.pdf`,
          });
        });

        const title =
          type.charAt(0).toUpperCase() + type.slice(1) + ' Report';
        doc.fontSize(20).text('Employee Management System', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(16).text(title, { align: 'center' });
        doc.moveDown(0.5);
        doc
          .fontSize(10)
          .fillColor('#666')
          .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        if (month && year) {
          doc.text(`Period: ${month}/${year}`, { align: 'center' });
        }
        doc.moveDown(1.5);
        doc.fillColor('#000');

        switch (type) {
          case 'employees':
            await this.renderEmployeesPdf(doc);
            break;
          case 'payrolls':
            await this.renderPayrollsPdf(doc, month, year);
            break;
          case 'taxes':
            await this.renderTaxesPdf(doc, month, year);
            break;
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private async renderEmployeesPdf(doc: InstanceType<typeof PDFDocument>) {
    const employees = await this.employeesService.findAll();
    doc.fontSize(12).text(`Total Employees: ${employees.length}`);
    doc.moveDown();

    for (const emp of employees) {
      doc
        .fontSize(11)
        .text(
          `${emp.employeeCode} - ${emp.name}`,
          { continued: false },
        );
      doc
        .fontSize(9)
        .fillColor('#444')
        .text(
          `Stage: ${emp.stage ?? '-'} | Designation: ${emp.designation} | Gross Salary: ${Number(emp.grossSalary ?? 0).toLocaleString()} | Status: ${emp.status}`,
        );
      doc.fillColor('#000').moveDown(0.5);
    }
  }

  private async renderPayrollsPdf(
    doc: InstanceType<typeof PDFDocument>,
    month?: number,
    year?: number,
  ) {
    const payrolls = await this.payrollsService.findAll(month, year);
    const summary = await this.payrollsService.getSummary(month, year);

    doc.fontSize(12).text(`Payroll Records: ${summary.count}`);
    doc.text(`Total Gross: ${summary.totalGross.toLocaleString()}`);
    doc.text(`Total Deductions: ${summary.totalDeductions.toLocaleString()}`);
    doc.text(`Total Net: ${summary.totalNet.toLocaleString()}`);
    doc.moveDown();

    for (const p of payrolls) {
      doc
        .fontSize(11)
        .text(
          `${p.employee?.employeeCode} - ${p.employee ? getEmployeeFullName(p.employee) : ''} (${p.month}/${p.year})`,
        );
      const slabRate =
        p.appliedTaxRate != null ? ` @ ${Number(p.appliedTaxRate)}%` : '';
      doc
        .fontSize(9)
        .fillColor('#444')
        .text(
          `Slab: ${p.taxSlabName}${slabRate} | Gross: ${Number(p.grossSalary).toLocaleString()} | Tax: ${Number(p.incomeTax).toLocaleString()} | Deductions: ${Number(p.totalDeductions).toLocaleString()} | Net: ${Number(p.netSalary).toLocaleString()}`,
        );

      if (p.deductions?.length) {
        const breakdown = p.deductions
          .map((d) => {
            const rate =
              d.calculationType === 'percentage' && d.appliedRate != null
                ? ` @ ${Number(d.appliedRate)}%`
                : d.calculationType === 'fixed' && d.appliedFixedAmount != null
                  ? ` fixed ${Number(d.appliedFixedAmount).toLocaleString()}`
                  : '';
            return `${d.code}${rate}: ${Number(d.amount).toLocaleString()}`;
          })
          .join(', ');
        doc.text(`Snapshot: ${breakdown}`);
      }

      doc.fillColor('#000').moveDown(0.5);
    }
  }

  private async renderTaxesPdf(
    doc: InstanceType<typeof PDFDocument>,
    month?: number,
    year?: number,
  ) {
    const [slabs, payrolls] = await Promise.all([
      this.taxSlabsService.findAllTaxSlabs(),
      this.payrollsService.findAll(month, year),
    ]);

    doc.fontSize(13).text('Tax Slabs & Sub-Taxes');
    doc.moveDown(0.3);
    for (const slab of slabs) {
      const max = slab.maxSalary ? Number(slab.maxSalary).toLocaleString() : '∞';
      doc
        .fontSize(10)
        .text(
          `${slab.name}: ${Number(slab.minSalary).toLocaleString()} - ${max} @ ${this.taxSlabsService.formatSlabTaxSummary(slab)} [${slab.isActive ? 'Active' : 'Inactive'}]`,
        );

      for (const sub of slab.subTaxes ?? []) {
        const value =
          sub.type === 'percentage'
            ? `${Number(sub.rate)}%`
            : `Fixed ${Number(sub.amount).toLocaleString()}`;
        doc
          .fontSize(9)
          .fillColor('#444')
          .text(
            `  └ ${sub.code} - ${sub.name}: ${value} [${sub.isActive ? 'Active' : 'Inactive'}]`,
          );
      }
      doc.fillColor('#000').moveDown(0.3);
    }

    if (payrolls.length > 0) {
      doc.moveDown();
      doc.fontSize(13).text('Applied Tax Summary');
      doc.moveDown(0.3);
      const totalTax = payrolls.reduce((s, p) => s + Number(p.incomeTax), 0);
      const totalSub = payrolls.reduce(
        (s, p) => s + (Number(p.totalDeductions) - Number(p.incomeTax)),
        0,
      );
      doc.fontSize(10).text(`Total Income Tax: ${totalTax.toLocaleString()}`);
      doc.text(`Total Sub-Tax Deductions: ${totalSub.toLocaleString()}`);
    }
  }
}
