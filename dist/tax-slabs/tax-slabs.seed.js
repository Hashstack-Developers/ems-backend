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
var TaxSlabsSeedService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxSlabsSeedService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const sub_tax_entity_1 = require("./entities/sub-tax.entity");
const tax_slab_entity_1 = require("./entities/tax-slab.entity");
const tax_slabs_service_1 = require("./tax-slabs.service");
let TaxSlabsSeedService = TaxSlabsSeedService_1 = class TaxSlabsSeedService {
    taxSlabsRepository;
    subTaxesRepository;
    taxSlabsService;
    logger = new common_1.Logger(TaxSlabsSeedService_1.name);
    constructor(taxSlabsRepository, subTaxesRepository, taxSlabsService) {
        this.taxSlabsRepository = taxSlabsRepository;
        this.subTaxesRepository = subTaxesRepository;
        this.taxSlabsService = taxSlabsService;
    }
    async onModuleInit() {
        await this.seedTaxSlabs();
        await this.taxSlabsService.migrateOrphanSubTaxes();
        await this.seedSubTaxesPerSlab();
    }
    async seedTaxSlabs() {
        const count = await this.taxSlabsRepository.count();
        if (count > 0) {
            return;
        }
        const slabs = [
            {
                name: 'Exempt',
                minSalary: 0,
                maxSalary: 50000,
                taxRate: 0,
                description: 'No income tax for salaries up to 50,000',
            },
            {
                name: 'Slab A',
                minSalary: 50001,
                maxSalary: 100000,
                taxRate: 5,
                description: '5% tax for salaries between 50,001 and 100,000',
            },
            {
                name: 'Slab B',
                minSalary: 100001,
                maxSalary: 200000,
                taxRate: 10,
                description: '10% tax for salaries between 100,001 and 200,000',
            },
            {
                name: 'Slab C',
                minSalary: 200001,
                maxSalary: null,
                taxRate: 15,
                description: '15% tax for salaries above 200,000',
            },
        ];
        await this.taxSlabsRepository.save(slabs);
        this.logger.log('Default tax slabs seeded');
    }
    async seedSubTaxesPerSlab() {
        const slabs = await this.taxSlabsRepository.find({ order: { minSalary: 'ASC' } });
        if (slabs.length === 0) {
            return;
        }
        const subTaxCount = await this.subTaxesRepository.count();
        if (subTaxCount > 0) {
            return;
        }
        const slabMap = Object.fromEntries(slabs.map((s) => [s.name, s]));
        const perSlabConfig = {
            Exempt: [
                { name: 'Professional Tax', code: 'PT', type: sub_tax_entity_1.SubTaxType.FIXED, amount: 100 },
            ],
            'Slab A': [
                { name: 'Employees Old-Age Benefits Institution', code: 'EOBI', type: sub_tax_entity_1.SubTaxType.PERCENTAGE, rate: 0.5 },
                { name: 'Professional Tax', code: 'PT', type: sub_tax_entity_1.SubTaxType.FIXED, amount: 150 },
            ],
            'Slab B': [
                { name: 'Employees Old-Age Benefits Institution', code: 'EOBI', type: sub_tax_entity_1.SubTaxType.PERCENTAGE, rate: 1 },
                { name: 'Social Security', code: 'SS', type: sub_tax_entity_1.SubTaxType.PERCENTAGE, rate: 0.5 },
                { name: 'Professional Tax', code: 'PT', type: sub_tax_entity_1.SubTaxType.FIXED, amount: 200 },
            ],
            'Slab C': [
                { name: 'Employees Old-Age Benefits Institution', code: 'EOBI', type: sub_tax_entity_1.SubTaxType.PERCENTAGE, rate: 1 },
                { name: 'Social Security', code: 'SS', type: sub_tax_entity_1.SubTaxType.PERCENTAGE, rate: 1 },
                { name: 'Professional Tax', code: 'PT', type: sub_tax_entity_1.SubTaxType.FIXED, amount: 300 },
            ],
        };
        for (const [slabName, subTaxes] of Object.entries(perSlabConfig)) {
            const slab = slabMap[slabName];
            if (!slab)
                continue;
            await this.subTaxesRepository.save(subTaxes.map((st) => ({
                ...st,
                taxSlabId: slab.id,
                isActive: true,
            })));
        }
        this.logger.log('Per-slab sub-taxes seeded');
    }
};
exports.TaxSlabsSeedService = TaxSlabsSeedService;
exports.TaxSlabsSeedService = TaxSlabsSeedService = TaxSlabsSeedService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(tax_slab_entity_1.TaxSlab)),
    __param(1, (0, typeorm_1.InjectRepository)(sub_tax_entity_1.SubTax)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        tax_slabs_service_1.TaxSlabsService])
], TaxSlabsSeedService);
//# sourceMappingURL=tax-slabs.seed.js.map