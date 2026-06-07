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
exports.TaxSlab = void 0;
const typeorm_1 = require("typeorm");
const sub_tax_entity_1 = require("./sub-tax.entity");
let TaxSlab = class TaxSlab {
    id;
    name;
    minSalary;
    maxSalary;
    taxRate;
    description;
    isActive;
    subTaxes;
    createdAt;
    updatedAt;
};
exports.TaxSlab = TaxSlab;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], TaxSlab.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TaxSlab.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'min_salary', type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], TaxSlab.prototype, "minSalary", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'max_salary',
        type: 'decimal',
        precision: 12,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], TaxSlab.prototype, "maxSalary", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tax_rate', type: 'decimal', precision: 5, scale: 2 }),
    __metadata("design:type", Number)
], TaxSlab.prototype, "taxRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, default: null }),
    __metadata("design:type", Object)
], TaxSlab.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], TaxSlab.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => sub_tax_entity_1.SubTax, (subTax) => subTax.taxSlab, { cascade: true }),
    __metadata("design:type", Array)
], TaxSlab.prototype, "subTaxes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], TaxSlab.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], TaxSlab.prototype, "updatedAt", void 0);
exports.TaxSlab = TaxSlab = __decorate([
    (0, typeorm_1.Entity)('tax_slabs')
], TaxSlab);
//# sourceMappingURL=tax-slab.entity.js.map