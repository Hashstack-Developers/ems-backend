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
exports.GpFundService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const payroll_entity_1 = require("../payrolls/entities/payroll.entity");
const gp_fund_record_entity_1 = require("./entities/gp-fund-record.entity");
let GpFundService = class GpFundService {
    gpFundRepository;
    payrollsRepository;
    constructor(gpFundRepository, payrollsRepository) {
        this.gpFundRepository = gpFundRepository;
        this.payrollsRepository = payrollsRepository;
    }
    async findAll() {
        return this.gpFundRepository.find({ order: { year: 'ASC' } });
    }
    async findOne(id) {
        const record = await this.gpFundRepository.findOne({ where: { id } });
        if (!record) {
            throw new common_1.NotFoundException(`GP Fund record with ID ${id} not found`);
        }
        return record;
    }
    async findByYear(year) {
        return this.gpFundRepository.findOne({ where: { year } });
    }
    async create(dto) {
        const existing = await this.findByYear(dto.year);
        if (existing) {
            throw new common_1.ConflictException(`GP Fund record for year ${dto.year} already exists`);
        }
        const record = this.gpFundRepository.create({
            year: dto.year,
            yearlyTaxCollection: dto.yearlyTaxCollection,
            markupRate: dto.markupRate ?? null,
            markupTaxAmount: dto.markupTaxAmount ?? 0,
            openingBalance: 0,
            closingBalance: 0,
        });
        await this.gpFundRepository.save(record);
        return this.recalculateAllBalances();
    }
    async update(id, dto) {
        const record = await this.findOne(id);
        if (dto.year !== undefined && dto.year !== record.year) {
            const conflict = await this.findByYear(dto.year);
            if (conflict && conflict.id !== id) {
                throw new common_1.ConflictException(`GP Fund record for year ${dto.year} already exists`);
            }
            record.year = dto.year;
        }
        if (dto.yearlyTaxCollection !== undefined) {
            record.yearlyTaxCollection = dto.yearlyTaxCollection;
        }
        if (dto.markupRate !== undefined) {
            record.markupRate = dto.markupRate;
        }
        if (dto.markupTaxAmount !== undefined) {
            record.markupTaxAmount = dto.markupTaxAmount;
        }
        await this.gpFundRepository.save(record);
        return this.recalculateAllBalances();
    }
    async remove(id) {
        const record = await this.findOne(id);
        await this.gpFundRepository.remove(record);
        return this.recalculateAllBalances();
    }
    async getSuggestedTaxCollection(year) {
        const payrolls = await this.payrollsRepository.find({ where: { year } });
        const suggestedAmount = payrolls.reduce((sum, p) => sum + Number(p.totalDeductions), 0);
        return {
            year,
            suggestedAmount: this.round(suggestedAmount),
            payrollCount: payrolls.length,
            source: 'Sum of total payroll deductions for the year',
        };
    }
    async recalculateAllBalances() {
        const records = await this.gpFundRepository.find({ order: { year: 'ASC' } });
        let previousClosing = 0;
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const opening = i === 0 ? 0 : previousClosing;
            const collection = Number(record.yearlyTaxCollection);
            const markup = Number(record.markupTaxAmount ?? 0);
            const closing = this.round(opening + collection + markup);
            record.openingBalance = opening;
            record.closingBalance = closing;
            previousClosing = closing;
            await this.gpFundRepository.save(record);
        }
        return this.gpFundRepository.find({ order: { year: 'ASC' } });
    }
    round(value) {
        return Math.round(value * 100) / 100;
    }
};
exports.GpFundService = GpFundService;
exports.GpFundService = GpFundService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(gp_fund_record_entity_1.GpFundRecord)),
    __param(1, (0, typeorm_1.InjectRepository)(payroll_entity_1.Payroll)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], GpFundService);
//# sourceMappingURL=gp-fund.service.js.map