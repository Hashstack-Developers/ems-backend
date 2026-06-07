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
exports.GpFundController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const create_gp_fund_record_dto_1 = require("./dto/create-gp-fund-record.dto");
const update_gp_fund_record_dto_1 = require("./dto/update-gp-fund-record.dto");
const gp_fund_service_1 = require("./gp-fund.service");
let GpFundController = class GpFundController {
    gpFundService;
    constructor(gpFundService) {
        this.gpFundService = gpFundService;
    }
    async findAll() {
        const data = await this.gpFundService.findAll();
        return { success: true, data };
    }
    async getSuggestedCollection(year) {
        const data = await this.gpFundService.getSuggestedTaxCollection(year);
        return { success: true, data };
    }
    async findOne(id) {
        const data = await this.gpFundService.findOne(id);
        return { success: true, data };
    }
    async create(dto) {
        const data = await this.gpFundService.create(dto);
        return { success: true, data };
    }
    async update(id, dto) {
        const data = await this.gpFundService.update(id, dto);
        return { success: true, data };
    }
    async remove(id) {
        const data = await this.gpFundService.remove(id);
        return { success: true, data };
    }
};
exports.GpFundController = GpFundController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GpFundController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('suggested-collection/:year'),
    __param(0, (0, common_1.Param)('year', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], GpFundController.prototype, "getSuggestedCollection", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], GpFundController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_gp_fund_record_dto_1.CreateGpFundRecordDto]),
    __metadata("design:returntype", Promise)
], GpFundController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_gp_fund_record_dto_1.UpdateGpFundRecordDto]),
    __metadata("design:returntype", Promise)
], GpFundController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], GpFundController.prototype, "remove", null);
exports.GpFundController = GpFundController = __decorate([
    (0, common_1.Controller)('gp-fund'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [gp_fund_service_1.GpFundService])
], GpFundController);
//# sourceMappingURL=gp-fund.controller.js.map