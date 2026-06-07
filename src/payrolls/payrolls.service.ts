import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeesService } from '../employees/employees.service';
import { Employee } from '../employees/entities/employee.entity';
import { TaxSlabsService } from '../tax-slabs/tax-slabs.service';
import { GeneratePayrollDto } from './dto/generate-payroll.dto';
import {
  DeductionCalculationType,
  DeductionCategory,
  PayrollDeduction,
} from './entities/payroll-deduction.entity';
import { SubTaxType } from '../tax-slabs/entities/sub-tax.entity';
import { Payroll, PayrollStatus } from './entities/payroll.entity';

@Injectable()
export class PayrollsService {
  constructor(
    @InjectRepository(Payroll)
    private readonly payrollsRepository: Repository<Payroll>,
    @InjectRepository(PayrollDeduction)
    private readonly deductionsRepository: Repository<PayrollDeduction>,
    private readonly employeesService: EmployeesService,
    private readonly taxSlabsService: TaxSlabsService,
  ) {}

  async generate(dto: GeneratePayrollDto): Promise<Payroll[]> {
    const employees = dto.employeeId
      ? [await this.employeesService.findOne(dto.employeeId)]
      : await this.employeesService.findActiveEmployees();

    if (employees.length === 0) {
      throw new BadRequestException('No active employees found for payroll generation');
    }

    const results: Payroll[] = [];

    for (const employee of employees) {
      const payroll = await this.generateForEmployee(employee, dto.month, dto.year);
      results.push(payroll);
    }

    return results;
  }

  async findAll(month?: number, year?: number): Promise<Payroll[]> {
    const query = this.payrollsRepository
      .createQueryBuilder('payroll')
      .leftJoinAndSelect('payroll.employee', 'employee')
      .leftJoinAndSelect('payroll.deductions', 'deductions')
      .orderBy('payroll.year', 'DESC')
      .addOrderBy('payroll.month', 'DESC');

    if (month) {
      query.andWhere('payroll.month = :month', { month });
    }
    if (year) {
      query.andWhere('payroll.year = :year', { year });
    }

    return query.getMany();
  }

  async findOne(id: number): Promise<Payroll> {
    const payroll = await this.payrollsRepository.findOne({
      where: { id },
      relations: { employee: true, deductions: true },
    });
    if (!payroll) {
      throw new NotFoundException(`Payroll with ID ${id} not found`);
    }
    return payroll;
  }

  async remove(id: number): Promise<void> {
    const payroll = await this.findOne(id);
    await this.payrollsRepository.remove(payroll);
  }

  async getSummary(month?: number, year?: number) {
    const payrolls = await this.findAll(month, year);
    const totalGross = payrolls.reduce(
      (sum, p) => sum + Number(p.grossSalary),
      0,
    );
    const totalDeductions = payrolls.reduce(
      (sum, p) => sum + Number(p.totalDeductions),
      0,
    );
    const totalNet = payrolls.reduce((sum, p) => sum + Number(p.netSalary), 0);

    return {
      count: payrolls.length,
      totalGross: this.round(totalGross),
      totalDeductions: this.round(totalDeductions),
      totalNet: this.round(totalNet),
    };
  }

  async getMonthlySummaries() {
    const rows = await this.payrollsRepository
      .createQueryBuilder('p')
      .select('p.year', 'year')
      .addSelect('p.month', 'month')
      .addSelect('COUNT(p.id)', 'count')
      .addSelect('SUM(p.gross_salary)', 'totalGross')
      .addSelect('SUM(p.total_deductions)', 'totalDeductions')
      .addSelect('SUM(p.net_salary)', 'totalNet')
      .groupBy('p.year')
      .addGroupBy('p.month')
      .orderBy('p.year', 'DESC')
      .addOrderBy('p.month', 'DESC')
      .getRawMany<{
        year: string;
        month: string;
        count: string;
        totalGross: string;
        totalDeductions: string;
        totalNet: string;
      }>();

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    return rows.map((row) => {
      const month = parseInt(row.month, 10);
      const year = parseInt(row.year, 10);
      return {
        month,
        year,
        label: `${monthNames[month - 1]} ${year}`,
        count: parseInt(row.count, 10),
        totalGross: this.round(Number(row.totalGross)),
        totalDeductions: this.round(Number(row.totalDeductions)),
        totalNet: this.round(Number(row.totalNet)),
      };
    });
  }

  private async generateForEmployee(
    employee: Employee,
    month: number,
    year: number,
  ): Promise<Payroll> {
    const existing = await this.payrollsRepository.findOne({
      where: { employeeId: employee.id, month, year },
    });
    if (existing) {
      throw new ConflictException(
        `Payroll already exists for ${employee.firstName} ${employee.lastName} for ${month}/${year}`,
      );
    }

    const grossSalary = Number(employee.basicSalary);
    const taxResult = await this.taxSlabsService.calculateTaxes(grossSalary);

    const payroll = this.payrollsRepository.create({
      employeeId: employee.id,
      month,
      year,
      basicSalary: grossSalary,
      grossSalary,
      incomeTax: taxResult.incomeTax,
      totalDeductions: taxResult.totalDeductions,
      netSalary: taxResult.netSalary,
      taxSlabId: taxResult.taxSlab?.id ?? null,
      taxSlabName: taxResult.taxSlab?.name ?? 'No applicable slab',
      appliedTaxRate: taxResult.taxSlab
        ? Number(taxResult.taxSlab.taxRate)
        : null,
      taxSlabMinSalary: taxResult.taxSlab
        ? Number(taxResult.taxSlab.minSalary)
        : null,
      taxSlabMaxSalary: taxResult.taxSlab?.maxSalary
        ? Number(taxResult.taxSlab.maxSalary)
        : null,
      status: PayrollStatus.PROCESSED,
    });

    const savedPayroll = await this.payrollsRepository.save(payroll);

    const deductions: Partial<PayrollDeduction>[] = [];

    if (taxResult.incomeTax > 0 && taxResult.taxSlab) {
      deductions.push({
        payrollId: savedPayroll.id,
        name: 'Income Tax',
        code: 'INCOME_TAX',
        category: DeductionCategory.INCOME_TAX,
        amount: taxResult.incomeTax,
        calculationType: DeductionCalculationType.PERCENTAGE,
        appliedRate: Number(taxResult.taxSlab.taxRate),
        appliedFixedAmount: null,
        sourceSubTaxId: null,
      });
    }

    for (const item of taxResult.subTaxDeductions) {
      const isPercentage = item.subTax.type === SubTaxType.PERCENTAGE;
      deductions.push({
        payrollId: savedPayroll.id,
        name: item.subTax.name,
        code: item.subTax.code,
        category: DeductionCategory.SUB_TAX,
        amount: item.amount,
        calculationType: isPercentage
          ? DeductionCalculationType.PERCENTAGE
          : DeductionCalculationType.FIXED,
        appliedRate: isPercentage ? Number(item.subTax.rate) : null,
        appliedFixedAmount: isPercentage ? null : Number(item.subTax.amount),
        sourceSubTaxId: item.subTax.id,
      });
    }

    if (deductions.length > 0) {
      await this.deductionsRepository.save(deductions);
    }

    return this.findOne(savedPayroll.id);
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
