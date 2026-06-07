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
exports.SubTax = exports.SubTaxType = void 0;
const typeorm_1 = require("typeorm");
const tax_slab_entity_1 = require("./tax-slab.entity");
var SubTaxType;
(function (SubTaxType) {
    SubTaxType["PERCENTAGE"] = "percentage";
    SubTaxType["FIXED"] = "fixed";
})(SubTaxType || (exports.SubTaxType = SubTaxType = {}));
let SubTax = class SubTax {
    id;
    taxSlabId;
    taxSlab;
    name;
    code;
    type;
    rate;
    amount;
    description;
    isActive;
    createdAt;
    updatedAt;
};
exports.SubTax = SubTax;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], SubTax.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tax_slab_id', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], SubTax.prototype, "taxSlabId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tax_slab_entity_1.TaxSlab, (slab) => slab.subTaxes, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'tax_slab_id' }),
    __metadata("design:type", tax_slab_entity_1.TaxSlab)
], SubTax.prototype, "taxSlab", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SubTax.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SubTax.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: SubTaxType }),
    __metadata("design:type", String)
], SubTax.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 4, nullable: true, default: null }),
    __metadata("design:type", Object)
], SubTax.prototype, "rate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, nullable: true, default: null }),
    __metadata("design:type", Object)
], SubTax.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, default: null }),
    __metadata("design:type", Object)
], SubTax.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], SubTax.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], SubTax.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], SubTax.prototype, "updatedAt", void 0);
exports.SubTax = SubTax = __decorate([
    (0, typeorm_1.Entity)('sub_taxes'),
    (0, typeorm_1.Unique)(['taxSlabId', 'code'])
], SubTax);
//# sourceMappingURL=sub-tax.entity.js.map