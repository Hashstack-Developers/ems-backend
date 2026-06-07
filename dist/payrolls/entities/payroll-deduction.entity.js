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
exports.PayrollDeduction = exports.DeductionCalculationType = exports.DeductionCategory = void 0;
const typeorm_1 = require("typeorm");
const payroll_entity_1 = require("./payroll.entity");
var DeductionCategory;
(function (DeductionCategory) {
    DeductionCategory["INCOME_TAX"] = "income_tax";
    DeductionCategory["SUB_TAX"] = "sub_tax";
})(DeductionCategory || (exports.DeductionCategory = DeductionCategory = {}));
var DeductionCalculationType;
(function (DeductionCalculationType) {
    DeductionCalculationType["PERCENTAGE"] = "percentage";
    DeductionCalculationType["FIXED"] = "fixed";
})(DeductionCalculationType || (exports.DeductionCalculationType = DeductionCalculationType = {}));
let PayrollDeduction = class PayrollDeduction {
    id;
    payrollId;
    payroll;
    name;
    code;
    category;
    amount;
    calculationType;
    appliedRate;
    appliedFixedAmount;
    sourceSubTaxId;
    createdAt;
};
exports.PayrollDeduction = PayrollDeduction;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], PayrollDeduction.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payroll_id' }),
    __metadata("design:type", Number)
], PayrollDeduction.prototype, "payrollId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => payroll_entity_1.Payroll, (payroll) => payroll.deductions, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'payroll_id' }),
    __metadata("design:type", payroll_entity_1.Payroll)
], PayrollDeduction.prototype, "payroll", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PayrollDeduction.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PayrollDeduction.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: DeductionCategory }),
    __metadata("design:type", String)
], PayrollDeduction.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], PayrollDeduction.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'calculation_type',
        type: 'enum',
        enum: DeductionCalculationType,
        nullable: true,
    }),
    __metadata("design:type", Object)
], PayrollDeduction.prototype, "calculationType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'applied_rate',
        type: 'decimal',
        precision: 10,
        scale: 4,
        nullable: true,
    }),
    __metadata("design:type", Object)
], PayrollDeduction.prototype, "appliedRate", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'applied_fixed_amount',
        type: 'decimal',
        precision: 12,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], PayrollDeduction.prototype, "appliedFixedAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'source_sub_tax_id', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], PayrollDeduction.prototype, "sourceSubTaxId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], PayrollDeduction.prototype, "createdAt", void 0);
exports.PayrollDeduction = PayrollDeduction = __decorate([
    (0, typeorm_1.Entity)('payroll_deductions')
], PayrollDeduction);
//# sourceMappingURL=payroll-deduction.entity.js.map