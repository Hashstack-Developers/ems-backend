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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalarySlipsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const pdfkit_1 = __importDefault(require("pdfkit"));
const typeorm_2 = require("typeorm");
const employees_service_1 = require("../employees/employees.service");
const payroll_entity_1 = require("./entities/payroll.entity");
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
let SalarySlipsService = class SalarySlipsService {
    payrollsRepository;
    employeesService;
    constructor(payrollsRepository, employeesService) {
        this.payrollsRepository = payrollsRepository;
        this.employeesService = employeesService;
    }
    async getAvailability(month, year) {
        this.validatePeriod(month, year);
        const [employees, payrolls] = await Promise.all([
            this.employeesService.findActiveEmployees(),
            this.payrollsRepository.find({
                where: { month, year },
                relations: { employee: true },
            }),
        ]);
        const payrollByEmployee = new Map(payrolls.map((p) => [p.employeeId, p]));
        return employees.map((emp) => {
            const payroll = payrollByEmployee.get(emp.id);
            const canGenerate = this.isPayrollEligible(payroll);
            let message = 'Payroll not processed for this period';
            if (payroll && !canGenerate) {
                message = `Payroll status is "${payroll.status}" — must be processed or paid`;
            }
            else if (canGenerate) {
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
    async generate(dto) {
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
            throw new common_1.NotFoundException(`No payroll found for this employee for ${MONTH_NAMES[dto.month - 1]} ${dto.year}. Process payroll first.`);
        }
        if (!this.isPayrollEligible(payroll)) {
            throw new common_1.BadRequestException(`Salary slip cannot be generated — payroll status is "${payroll.status}". Payroll must be processed or paid.`);
        }
        return this.mapPayrollToSlip(payroll);
    }
    async generatePdf(payrollId) {
        const payroll = await this.payrollsRepository.findOne({
            where: { id: payrollId },
            relations: { employee: true, deductions: true },
        });
        if (!payroll) {
            throw new common_1.NotFoundException(`Payroll with ID ${payrollId} not found`);
        }
        if (!this.isPayrollEligible(payroll)) {
            throw new common_1.BadRequestException(`Salary slip cannot be generated — payroll status is "${payroll.status}"`);
        }
        const slip = this.mapPayrollToSlip(payroll);
        const buffer = await this.renderPdf(slip);
        return {
            buffer,
            filename: `${slip.slipNumber}.pdf`,
        };
    }
    mapPayrollToSlip(payroll) {
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
                appliedFixedAmount: d.appliedFixedAmount != null ? Number(d.appliedFixedAmount) : null,
                amount: Number(d.amount),
            })),
            summary: {
                grossSalary: Number(payroll.grossSalary),
                totalDeductions: Number(payroll.totalDeductions),
                netSalary: Number(payroll.netSalary),
                incomeTax: Number(payroll.incomeTax),
                taxSlabName: payroll.taxSlabName,
                appliedTaxRate: payroll.appliedTaxRate != null ? Number(payroll.appliedTaxRate) : null,
            },
            status: payroll.status,
            generatedAt: new Date().toISOString(),
        };
    }
    isPayrollEligible(payroll) {
        if (!payroll)
            return false;
        return (payroll.status === payroll_entity_1.PayrollStatus.PROCESSED ||
            payroll.status === payroll_entity_1.PayrollStatus.PAID);
    }
    validatePeriod(month, year) {
        if (month < 1 || month > 12) {
            throw new common_1.BadRequestException('Month must be between 1 and 12');
        }
        if (year < 2000 || year > 2100) {
            throw new common_1.BadRequestException('Year must be between 2000 and 2100');
        }
    }
    renderPdf(slip) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
                const chunks = [];
                doc.on('data', (chunk) => chunks.push(chunk));
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
                }
                else {
                    for (const d of slip.deductions) {
                        const rate = d.calculationType === 'percentage' && d.appliedRate != null
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
                    const rate = slip.summary.appliedTaxRate != null
                        ? ` @ ${slip.summary.appliedTaxRate}%`
                        : '';
                    doc.text(`Tax Slab: ${slip.summary.taxSlabName}${rate}`);
                }
                doc.text(`Gross: ${slip.summary.grossSalary.toLocaleString()}`);
                doc.text(`Total Deductions: ${slip.summary.totalDeductions.toLocaleString()}`);
                doc.fontSize(11).fillColor('#000').text(`Net Salary: ${slip.summary.netSalary.toLocaleString()}`, { underline: true });
                doc.end();
            }
            catch (err) {
                reject(err);
            }
        });
    }
};
exports.SalarySlipsService = SalarySlipsService;
exports.SalarySlipsService = SalarySlipsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payroll_entity_1.Payroll)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        employees_service_1.EmployeesService])
], SalarySlipsService);
//# sourceMappingURL=salary-slips.service.js.map