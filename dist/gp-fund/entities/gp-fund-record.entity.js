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
exports.GpFundRecord = void 0;
const typeorm_1 = require("typeorm");
let GpFundRecord = class GpFundRecord {
    id;
    year;
    openingBalance;
    yearlyTaxCollection;
    markupRate;
    markupTaxAmount;
    closingBalance;
    createdAt;
    updatedAt;
};
exports.GpFundRecord = GpFundRecord;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], GpFundRecord.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', unique: true }),
    __metadata("design:type", Number)
], GpFundRecord.prototype, "year", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'opening_balance',
        type: 'decimal',
        precision: 14,
        scale: 2,
        default: 0,
    }),
    __metadata("design:type", Number)
], GpFundRecord.prototype, "openingBalance", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'yearly_tax_collection',
        type: 'decimal',
        precision: 14,
        scale: 2,
        default: 0,
    }),
    __metadata("design:type", Number)
], GpFundRecord.prototype, "yearlyTaxCollection", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'markup_rate',
        type: 'decimal',
        precision: 5,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Object)
], GpFundRecord.prototype, "markupRate", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'markup_tax_amount',
        type: 'decimal',
        precision: 14,
        scale: 2,
        default: 0,
    }),
    __metadata("design:type", Number)
], GpFundRecord.prototype, "markupTaxAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'closing_balance',
        type: 'decimal',
        precision: 14,
        scale: 2,
        default: 0,
    }),
    __metadata("design:type", Number)
], GpFundRecord.prototype, "closingBalance", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], GpFundRecord.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], GpFundRecord.prototype, "updatedAt", void 0);
exports.GpFundRecord = GpFundRecord = __decorate([
    (0, typeorm_1.Entity)('gp_fund_records')
], GpFundRecord);
//# sourceMappingURL=gp-fund-record.entity.js.map