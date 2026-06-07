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
exports.TaxSlabsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const sub_tax_entity_1 = require("./entities/sub-tax.entity");
const tax_slab_entity_1 = require("./entities/tax-slab.entity");
let TaxSlabsService = class TaxSlabsService {
    taxSlabsRepository;
    subTaxesRepository;
    constructor(taxSlabsRepository, subTaxesRepository) {
        this.taxSlabsRepository = taxSlabsRepository;
        this.subTaxesRepository = subTaxesRepository;
    }
    async createTaxSlab(dto) {
        this.validateSalaryRange(dto.minSalary, dto.maxSalary ?? null);
        const slab = this.taxSlabsRepository.create({
            ...dto,
            isActive: dto.isActive ?? true,
        });
        const saved = await this.taxSlabsRepository.save(slab);
        return this.findOneTaxSlab(saved.id);
    }
    async findAllTaxSlabs() {
        return this.taxSlabsRepository.find({
            relations: { subTaxes: true },
            order: { minSalary: 'ASC' },
        });
    }
    async findOneTaxSlab(id) {
        const slab = await this.taxSlabsRepository.findOne({
            where: { id },
            relations: { subTaxes: true },
        });
        if (!slab) {
            throw new common_1.NotFoundException(`Tax slab with ID ${id} not found`);
        }
        return slab;
    }
    async updateTaxSlab(id, dto) {
        const slab = await this.findOneTaxSlab(id);
        const minSalary = dto.minSalary ?? Number(slab.minSalary);
        const maxSalary = dto.maxSalary !== undefined ? dto.maxSalary : slab.maxSalary;
        this.validateSalaryRange(minSalary, maxSalary ?? null);
        Object.assign(slab, dto);
        await this.taxSlabsRepository.save(slab);
        return this.findOneTaxSlab(id);
    }
    async removeTaxSlab(id) {
        const slab = await this.findOneTaxSlab(id);
        await this.taxSlabsRepository.remove(slab);
    }
    async createSubTax(slabId, dto) {
        await this.findOneTaxSlab(slabId);
        this.validateSubTaxPayload(dto);
        const existing = await this.subTaxesRepository.findOne({
            where: { taxSlabId: slabId, code: dto.code.toUpperCase() },
        });
        if (existing) {
            throw new common_1.ConflictException(`Sub-tax code '${dto.code}' already exists in this slab`);
        }
        const subTax = this.subTaxesRepository.create({
            ...dto,
            taxSlabId: slabId,
            code: dto.code.toUpperCase(),
            isActive: dto.isActive ?? true,
        });
        return this.subTaxesRepository.save(subTax);
    }
    async findSubTaxesBySlab(slabId) {
        await this.findOneTaxSlab(slabId);
        return this.subTaxesRepository.find({
            where: { taxSlabId: slabId },
            order: { name: 'ASC' },
        });
    }
    async findAllSubTaxes() {
        return this.subTaxesRepository.find({
            relations: { taxSlab: true },
            order: { taxSlabId: 'ASC', name: 'ASC' },
        });
    }
    async findOneSubTax(slabId, id) {
        const subTax = await this.subTaxesRepository.findOne({
            where: { id, taxSlabId: slabId },
        });
        if (!subTax) {
            throw new common_1.NotFoundException(`Sub-tax with ID ${id} not found in slab ${slabId}`);
        }
        return subTax;
    }
    async updateSubTax(slabId, id, dto) {
        const subTax = await this.findOneSubTax(slabId, id);
        if (dto.code && dto.code.toUpperCase() !== subTax.code) {
            const existing = await this.subTaxesRepository.findOne({
                where: { taxSlabId: slabId, code: dto.code.toUpperCase() },
            });
            if (existing) {
                throw new common_1.ConflictException(`Sub-tax code '${dto.code}' already exists in this slab`);
            }
        }
        const merged = { ...subTax, ...dto, type: dto.type ?? subTax.type };
        this.validateSubTaxPayload(merged);
        Object.assign(subTax, dto);
        if (dto.code) {
            subTax.code = dto.code.toUpperCase();
        }
        return this.subTaxesRepository.save(subTax);
    }
    async removeSubTax(slabId, id) {
        const subTax = await this.findOneSubTax(slabId, id);
        await this.subTaxesRepository.remove(subTax);
    }
    async findApplicableTaxSlab(salary) {
        const slabs = await this.taxSlabsRepository.find({
            where: { isActive: true },
            relations: { subTaxes: true },
            order: { minSalary: 'ASC' },
        });
        return (slabs.find((slab) => {
            const min = Number(slab.minSalary);
            const max = slab.maxSalary !== null ? Number(slab.maxSalary) : null;
            return salary >= min && (max === null || salary <= max);
        }) ?? null);
    }
    async calculateTaxes(grossSalary) {
        const taxSlab = await this.findApplicableTaxSlab(grossSalary);
        const incomeTax = taxSlab
            ? this.round((grossSalary * Number(taxSlab.taxRate)) / 100)
            : 0;
        const activeSubTaxes = taxSlab?.subTaxes?.filter((st) => st.isActive) ?? [];
        const subTaxDeductions = activeSubTaxes.map((subTax) => ({
            subTax,
            amount: this.calculateSubTaxAmount(subTax, grossSalary),
        }));
        const subTaxTotal = subTaxDeductions.reduce((sum, item) => sum + item.amount, 0);
        const totalDeductions = this.round(incomeTax + subTaxTotal);
        const netSalary = this.round(grossSalary - totalDeductions);
        return {
            taxSlab,
            incomeTax,
            subTaxDeductions,
            totalDeductions,
            netSalary,
        };
    }
    async migrateOrphanSubTaxes() {
        const orphans = await this.subTaxesRepository
            .createQueryBuilder('st')
            .where('st.tax_slab_id IS NULL')
            .getMany();
        if (orphans.length === 0) {
            return;
        }
        const slabs = await this.taxSlabsRepository.find({ order: { minSalary: 'ASC' } });
        if (slabs.length === 0) {
            return;
        }
        const defaultSlab = slabs.find((s) => s.name === 'Slab B') ?? slabs[0];
        for (const orphan of orphans) {
            orphan.taxSlabId = defaultSlab.id;
            await this.subTaxesRepository.save(orphan);
            for (const slab of slabs) {
                if (slab.id === defaultSlab.id)
                    continue;
                await this.subTaxesRepository.save({
                    taxSlabId: slab.id,
                    name: orphan.name,
                    code: orphan.code,
                    type: orphan.type,
                    rate: orphan.rate,
                    amount: orphan.amount,
                    description: orphan.description,
                    isActive: orphan.isActive,
                });
            }
        }
    }
    calculateSubTaxAmount(subTax, grossSalary) {
        if (subTax.type === sub_tax_entity_1.SubTaxType.PERCENTAGE) {
            return this.round((grossSalary * Number(subTax.rate)) / 100);
        }
        return this.round(Number(subTax.amount));
    }
    validateSalaryRange(minSalary, maxSalary) {
        if (maxSalary !== null && maxSalary !== undefined && maxSalary <= minSalary) {
            throw new common_1.BadRequestException('Maximum salary must be greater than minimum salary');
        }
    }
    validateSubTaxPayload(dto) {
        if (dto.type === sub_tax_entity_1.SubTaxType.PERCENTAGE && dto.rate === undefined) {
            throw new common_1.BadRequestException('Rate is required for percentage-based sub-taxes');
        }
        if (dto.type === sub_tax_entity_1.SubTaxType.FIXED && dto.amount === undefined) {
            throw new common_1.BadRequestException('Amount is required for fixed sub-taxes');
        }
    }
    round(value) {
        return Math.round(value * 100) / 100;
    }
};
exports.TaxSlabsService = TaxSlabsService;
exports.TaxSlabsService = TaxSlabsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(tax_slab_entity_1.TaxSlab)),
    __param(1, (0, typeorm_1.InjectRepository)(sub_tax_entity_1.SubTax)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], TaxSlabsService);
//# sourceMappingURL=tax-slabs.service.js.map