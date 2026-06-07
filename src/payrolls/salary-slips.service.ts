import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import PDFDocument from 'pdfkit';
import { Repository } from 'typeorm';
import { EmployeesService } from '../employees/employees.service';
import { GenerateSalarySlipDto } from './dto/generate-salary-slip.dto';
import { Payroll, PayrollStatus } from './entities/payroll.entity';

export interface SalarySlipDeduction {
  name: string;
  code: string;
  category: string;
  calculationType: string | null;
  appliedRate: number | null;
  appliedFixedAmount: number | null;
  amount: number;
}

export interface SalarySlip {
  payrollId: number;
  slipNumber: string;
  period: { month: number; year: number; label: string };
  employee: {
    id: number;
    employeeCode: string;
    firstName: string;
    lastName: string;
    fullName: string;
    department: string;
    designation: string;
    email: string;
    joinDate: string;
  };
  earnings: {
    basicSalary: number;
    grossSalary: number;
  };
  deductions: SalarySlipDeduction[];
  summary: {
    grossSalary: number;
    totalDeductions: number;
    netSalary: number;
    incomeTax: number;
    taxSlabName: string | null;
    appliedTaxRate: number | null;
  };
  status: PayrollStatus;
  generatedAt: string;
}

export interface SalarySlipAvailability {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  department: string;
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
        fullName: `${emp.firstName} ${emp.lastName}`,
        department: emp.department,
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

    const slip = this.mapPayrollToSlip(payroll);
    const buffer = await this.renderPdf(slip);
    return {
      buffer,
      filename: `${slip.slipNumber}.pdf`,
    };
  }

  private mapPayrollToSlip(payroll: Payroll): SalarySlip {
    const emp = payroll.employee;
    const monthLabel = MONTH_NAMES[payroll.month - 1];

    return {
      payrollId: payroll.id,
      slipNumber: `SLIP-${payroll.year}-${String(payroll.month).padStart(2, '0')}-${emp.employeeCode}`,
      period: {
        month: payroll.month,
        year: payroll.year,
        label: `${monthLabel} ${payroll.year}`,
      },
      employee: {
        id: emp.id,
        employeeCode: emp.employeeCode,
        firstName: emp.firstName,
        lastName: emp.lastName,
        fullName: `${emp.firstName} ${emp.lastName}`,
        department: emp.department,
        designation: emp.designation,
        email: emp.email,
        joinDate: emp.joinDate,
      },
      earnings: {
        basicSalary: Number(payroll.basicSalary),
        grossSalary: Number(payroll.grossSalary),
      },
      deductions: (payroll.deductions ?? []).map((d) => ({
        name: d.name,
        code: d.code,
        category: d.category,
        calculationType: d.calculationType,
        appliedRate: d.appliedRate != null ? Number(d.appliedRate) : null,
        appliedFixedAmount:
          d.appliedFixedAmount != null ? Number(d.appliedFixedAmount) : null,
        amount: Number(d.amount),
      })),
      summary: {
        grossSalary: Number(payroll.grossSalary),
        totalDeductions: Number(payroll.totalDeductions),
        netSalary: Number(payroll.netSalary),
        incomeTax: Number(payroll.incomeTax),
        taxSlabName: payroll.taxSlabName,
        appliedTaxRate:
          payroll.appliedTaxRate != null ? Number(payroll.appliedTaxRate) : null,
      },
      status: payroll.status,
      generatedAt: new Date().toISOString(),
    };
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

  private renderPdf(slip: SalarySlip): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        doc.fontSize(18).text('Employee Management System', { align: 'center' });
        doc.fontSize(14).text('Salary Slip', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#666').text(slip.slipNumber, { align: 'center' });
        doc.text(`Period: ${slip.period.label}`, { align: 'center' });
        doc.text(`Generated: ${new Date(slip.generatedAt).toLocaleString()}`, { align: 'center' });
        doc.moveDown(1);
        doc.fillColor('#000');

        doc.fontSize(12).text('Employee Details');
        doc.fontSize(10).fillColor('#444');
        doc.text(`Name: ${slip.employee.fullName}`);
        doc.text(`Code: ${slip.employee.employeeCode}`);
        doc.text(`Department: ${slip.employee.department} | Designation: ${slip.employee.designation}`);
        doc.moveDown(1);
        doc.fillColor('#000');

        doc.fontSize(12).text('Earnings');
        doc.fontSize(10).fillColor('#444');
        doc.text(`Basic / Gross Salary: ${slip.earnings.grossSalary.toLocaleString()}`);
        doc.moveDown(0.5);

        doc.fontSize(12).fillColor('#000').text('Deductions (snapshot at payroll time)');
        doc.fontSize(10).fillColor('#444');
        if (slip.deductions.length === 0) {
          doc.text('No deductions');
        } else {
          for (const d of slip.deductions) {
            const rate =
              d.calculationType === 'percentage' && d.appliedRate != null
                ? ` @ ${d.appliedRate}%`
                : d.calculationType === 'fixed' && d.appliedFixedAmount != null
                  ? ` (fixed ${d.appliedFixedAmount.toLocaleString()})`
                  : '';
            doc.text(`${d.name} (${d.code})${rate}: ${d.amount.toLocaleString()}`);
          }
        }

        doc.moveDown(1);
        doc.fontSize(12).fillColor('#000').text('Summary');
        doc.fontSize(10).fillColor('#444');
        if (slip.summary.taxSlabName) {
          const rate =
            slip.summary.appliedTaxRate != null
              ? ` @ ${slip.summary.appliedTaxRate}%`
              : '';
          doc.text(`Tax Slab: ${slip.summary.taxSlabName}${rate}`);
        }
        doc.text(`Gross: ${slip.summary.grossSalary.toLocaleString()}`);
        doc.text(`Total Deductions: ${slip.summary.totalDeductions.toLocaleString()}`);
        doc.fontSize(11).fillColor('#000').text(`Net Salary: ${slip.summary.netSalary.toLocaleString()}`, { underline: true });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
