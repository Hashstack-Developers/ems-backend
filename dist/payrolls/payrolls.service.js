"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const employees_service_1 = require("../employees/employees.service");
const tax_slabs_service_1 = require("../tax-slabs/tax-slabs.service");
const payroll_deduction_entity_1 = require("./entities/payroll-deduction.entity");
const sub_tax_entity_1 = require("../tax-slabs/entities/sub-tax.entity");
const payroll_entity_1 = require("./entities/payroll.entity");
let PayrollsService = class PayrollsService {
    payrollsRepository;
    deductionsRepository;
    employeesService;
    taxSlabsService;
    constructor(payrollsRepository, deductionsRepository, employeesService, taxSlabsService) {
        this.payrollsRepository = payrollsRepository;
        this.deductionsRepository = deductionsRepository;
        this.employeesService = employeesService;
        this.taxSlabsService = taxSlabsService;
    }
    async generate(dto) {
        const employees = dto.employeeId
            ? [await this.employeesService.findOne(dto.employeeId)]
            : await this.employeesService.findActiveEmployees();
        if (employees.length === 0) {
            throw new common_1.BadRequestException('No active employees found for payroll generation');
        }
        const results = [];
        for (const employee of employees) {
            const payroll = await this.generateForEmployee(employee, dto.month, dto.year);
            results.push(payroll);
        }
        return results;
    }
    async findAll(month, year) {
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
    async findOne(id) {
        const payroll = await this.payrollsRepository.findOne({
            where: { id },
            relations: { employee: true, deductions: true },
        });
        if (!payroll) {
            throw new common_1.NotFoundException(`Payroll with ID ${id} not found`);
        }
        return payroll;
    }
    async remove(id) {
        const payroll = await this.findOne(id);
        await this.payrollsRepository.remove(payroll);
    }
    async getSummary(month, year) {
        const payrolls = await this.findAll(month, year);
        const totalGross = payrolls.reduce((sum, p) => sum + Number(p.grossSalary), 0);
        const totalDeductions = payrolls.reduce((sum, p) => sum + Number(p.totalDeductions), 0);
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
            .getRawMany();
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
    async generateForEmployee(employee, month, year) {
        const existing = await this.payrollsRepository.findOne({
            where: { employeeId: employee.id, month, year },
        });
        if (existing) {
            throw new common_1.ConflictException(`Payroll already exists for ${employee.firstName} ${employee.lastName} for ${month}/${year}`);
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
            status: payroll_entity_1.PayrollStatus.PROCESSED,
        });
        const savedPayroll = await this.payrollsRepository.save(payroll);
        const deductions = [];
        if (taxResult.incomeTax > 0 && taxResult.taxSlab) {
            deductions.push({
                payrollId: savedPayroll.id,
                name: 'Income Tax',
                code: 'INCOME_TAX',
                category: payroll_deduction_entity_1.DeductionCategory.INCOME_TAX,
                amount: taxResult.incomeTax,
                calculationType: payroll_deduction_entity_1.DeductionCalculationType.PERCENTAGE,
                appliedRate: Number(taxResult.taxSlab.taxRate),
                appliedFixedAmount: null,
                sourceSubTaxId: null,
            });
        }
        for (const item of taxResult.subTaxDeductions) {
            const isPercentage = item.subTax.type === sub_tax_entity_1.SubTaxType.PERCENTAGE;
            deductions.push({
                payrollId: savedPayroll.id,
                name: item.subTax.name,
                code: item.subTax.code,
                category: payroll_deduction_entity_1.DeductionCategory.SUB_TAX,
                amount: item.amount,
                calculationType: isPercentage
                    ? payroll_deduction_entity_1.DeductionCalculationType.PERCENTAGE
                    : payroll_deduction_entity_1.DeductionCalculationType.FIXED,
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
    round(value) {
        return Math.round(value * 100) / 100;
    }
};
exports.PayrollsService = PayrollsService;
exports.PayrollsService = PayrollsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payroll_entity_1.Payroll)),
    __param(1, (0, typeorm_1.InjectRepository)(payroll_deduction_entity_1.PayrollDeduction)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        employees_service_1.EmployeesService,
        tax_slabs_service_1.TaxSlabsService])
], PayrollsService);
//# sourceMappingURL=payrolls.service.js.map