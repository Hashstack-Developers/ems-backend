"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxSlabsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const sub_tax_entity_1 = require("./entities/sub-tax.entity");
const tax_slab_entity_1 = require("./entities/tax-slab.entity");
const tax_slabs_controller_1 = require("./tax-slabs.controller");
const tax_slabs_service_1 = require("./tax-slabs.service");
const tax_slabs_seed_1 = require("./tax-slabs.seed");
let TaxSlabsModule = class TaxSlabsModule {
};
exports.TaxSlabsModule = TaxSlabsModule;
exports.TaxSlabsModule = TaxSlabsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([tax_slab_entity_1.TaxSlab, sub_tax_entity_1.SubTax])],
        controllers: [tax_slabs_controller_1.TaxSlabsController],
        providers: [tax_slabs_service_1.TaxSlabsService, tax_slabs_seed_1.TaxSlabsSeedService],
        exports: [tax_slabs_service_1.TaxSlabsService],
    })
], TaxSlabsModule);
//# sourceMappingURL=tax-slabs.module.js.map