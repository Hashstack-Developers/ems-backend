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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Payroll = exports.PayrollStatus = void 0;
const typeorm_1 = require("typeorm");
const employee_entity_1 = require("../../employees/entities/employee.entity");
const payroll_deduction_entity_1 = require("./payroll-deduction.entity");
var PayrollStatus;
(function (PayrollStatus) {
    PayrollStatus["DRAFT"] = "draft";
    PayrollStatus["PROCESSED"] = "processed";
    PayrollStatus["PAID"] = "paid";
})(PayrollStatus || (exports.PayrollStatus = PayrollStatus = {}));
let Payroll = class Payroll {
    id;
    employeeId;
    employee;
    month;
    year;
    basicSalary;
    grossSalary;
    incomeTax;
    totalDeductions;
    netSalary;
    taxSlabId;
    taxSlabName;
    appliedTaxRate;
    taxSlabMinSalary;
    taxSlabMaxSalary;
    status;
    deductions;
    createdAt;
    updatedAt;
};
exports.Payroll = Payroll;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Payroll.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'employee_id' }),
    __metadata("design:type", Number)
], Payroll.prototype, "employeeId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => employee_entity_1.Employee, (employee) => employee.payrolls, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'employee_id' }),
    __metadata("design:type", employee_entity_1.Employee)
], Payroll.prototype, "employee", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], Payroll.prototype, "month", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], Payroll.prototype, "year", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'basic_salary', type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], Payroll.prototype, "basicSalary", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gross_salary', type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], Payroll.prototype, "grossSalary", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'income_tax', type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], Payroll.prototype, "incomeTax", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_deductions', type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], Payroll.prototype, "totalDeductions", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'net_salary', type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], Payroll.prototype, "netSalary", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tax_slab_id', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], Payroll.prototype, "taxSlabId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tax_slab_name', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], Payroll.prototype, "taxSlabName", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'applied_tax_rate',
        type: 'decimal',
        precision: 5,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], Payroll.prototype, "appliedTaxRate", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'tax_slab_min_salary',
        type: 'decimal',
        precision: 12,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], Payroll.prototype, "taxSlabMinSalary", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'tax_slab_max_salary',
        type: 'decimal',
        precision: 12,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], Payroll.prototype, "taxSlabMaxSalary", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PayrollStatus,
        default: PayrollStatus.PROCESSED,
    }),
    __metadata("design:type", String)
], Payroll.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => payroll_deduction_entity_1.PayrollDeduction, (deduction) => deduction.payroll, {
        cascade: true,
    }),
    __metadata("design:type", Array)
], Payroll.prototype, "deductions", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Payroll.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Payroll.prototype, "updatedAt", void 0);
exports.Payroll = Payroll = __decorate([
    (0, typeorm_1.Entity)('payrolls'),
    (0, typeorm_1.Unique)(['employeeId', 'month', 'year'])
], Payroll);
//# sourceMappingURL=payroll.entity.js.map