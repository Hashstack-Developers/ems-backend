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
exports.TaxSlabsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const create_sub_tax_dto_1 = require("./dto/create-sub-tax.dto");
const create_tax_slab_dto_1 = require("./dto/create-tax-slab.dto");
const update_sub_tax_dto_1 = require("./dto/update-sub-tax.dto");
const update_tax_slab_dto_1 = require("./dto/update-tax-slab.dto");
const tax_slabs_service_1 = require("./tax-slabs.service");
let TaxSlabsController = class TaxSlabsController {
    taxSlabsService;
    constructor(taxSlabsService) {
        this.taxSlabsService = taxSlabsService;
    }
    async createSubTax(slabId, dto) {
        const data = await this.taxSlabsService.createSubTax(slabId, dto);
        return { success: true, data };
    }
    async findSubTaxesBySlab(slabId) {
        const data = await this.taxSlabsService.findSubTaxesBySlab(slabId);
        return { success: true, data };
    }
    async findOneSubTax(slabId, id) {
        const data = await this.taxSlabsService.findOneSubTax(slabId, id);
        return { success: true, data };
    }
    async updateSubTax(slabId, id, dto) {
        const data = await this.taxSlabsService.updateSubTax(slabId, id, dto);
        return { success: true, data };
    }
    async removeSubTax(slabId, id) {
        await this.taxSlabsService.removeSubTax(slabId, id);
        return { success: true, message: 'Sub-tax deleted successfully' };
    }
    async createTaxSlab(dto) {
        const data = await this.taxSlabsService.createTaxSlab(dto);
        return { success: true, data };
    }
    async findAllTaxSlabs() {
        const data = await this.taxSlabsService.findAllTaxSlabs();
        return { success: true, data };
    }
    async findOneTaxSlab(id) {
        const data = await this.taxSlabsService.findOneTaxSlab(id);
        return { success: true, data };
    }
    async updateTaxSlab(id, dto) {
        const data = await this.taxSlabsService.updateTaxSlab(id, dto);
        return { success: true, data };
    }
    async removeTaxSlab(id) {
        await this.taxSlabsService.removeTaxSlab(id);
        return { success: true, message: 'Tax slab deleted successfully' };
    }
};
exports.TaxSlabsController = TaxSlabsController;
__decorate([
    (0, common_1.Post)(':slabId/sub-taxes'),
    __param(0, (0, common_1.Param)('slabId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_sub_tax_dto_1.CreateSubTaxDto]),
    __metadata("design:returntype", Promise)
], TaxSlabsController.prototype, "createSubTax", null);
__decorate([
    (0, common_1.Get)(':slabId/sub-taxes'),
    __param(0, (0, common_1.Param)('slabId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], TaxSlabsController.prototype, "findSubTaxesBySlab", null);
__decorate([
    (0, common_1.Get)(':slabId/sub-taxes/:id'),
    __param(0, (0, common_1.Param)('slabId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], TaxSlabsController.prototype, "findOneSubTax", null);
__decorate([
    (0, common_1.Patch)(':slabId/sub-taxes/:id'),
    __param(0, (0, common_1.Param)('slabId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, update_sub_tax_dto_1.UpdateSubTaxDto]),
    __metadata("design:returntype", Promise)
], TaxSlabsController.prototype, "updateSubTax", null);
__decorate([
    (0, common_1.Delete)(':slabId/sub-taxes/:id'),
    __param(0, (0, common_1.Param)('slabId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], TaxSlabsController.prototype, "removeSubTax", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_tax_slab_dto_1.CreateTaxSlabDto]),
    __metadata("design:returntype", Promise)
], TaxSlabsController.prototype, "createTaxSlab", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TaxSlabsController.prototype, "findAllTaxSlabs", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], TaxSlabsController.prototype, "findOneTaxSlab", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_tax_slab_dto_1.UpdateTaxSlabDto]),
    __metadata("design:returntype", Promise)
], TaxSlabsController.prototype, "updateTaxSlab", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], TaxSlabsController.prototype, "removeTaxSlab", null);
exports.TaxSlabsController = TaxSlabsController = __decorate([
    (0, common_1.Controller)('tax-slabs'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [tax_slabs_service_1.TaxSlabsService])
], TaxSlabsController);
//# sourceMappingURL=tax-slabs.controller.js.map