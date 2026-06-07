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
exports.PayrollsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const generate_payroll_dto_1 = require("./dto/generate-payroll.dto");
const payrolls_service_1 = require("./payrolls.service");
let PayrollsController = class PayrollsController {
    payrollsService;
    constructor(payrollsService) {
        this.payrollsService = payrollsService;
    }
    async generate(dto) {
        const data = await this.payrollsService.generate(dto);
        return {
            success: true,
            message: `Generated ${data.length} payroll record(s)`,
            data,
        };
    }
    async getSummary(month, year) {
        const data = await this.payrollsService.getSummary(month ? parseInt(month, 10) : undefined, year ? parseInt(year, 10) : undefined);
        return { success: true, data };
    }
    async findAll(month, year) {
        const data = await this.payrollsService.findAll(month ? parseInt(month, 10) : undefined, year ? parseInt(year, 10) : undefined);
        return { success: true, data };
    }
    async findOne(id) {
        const data = await this.payrollsService.findOne(id);
        return { success: true, data };
    }
    async remove(id) {
        await this.payrollsService.remove(id);
        return { success: true, message: 'Payroll deleted successfully' };
    }
};
exports.PayrollsController = PayrollsController;
__decorate([
    (0, common_1.Post)('generate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [generate_payroll_dto_1.GeneratePayrollDto]),
    __metadata("design:returntype", Promise)
], PayrollsController.prototype, "generate", null);
__decorate([
    (0, common_1.Get)('summary'),
    __param(0, (0, common_1.Query)('month')),
    __param(1, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PayrollsController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('month')),
    __param(1, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PayrollsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], PayrollsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], PayrollsController.prototype, "remove", null);
exports.PayrollsController = PayrollsController = __decorate([
    (0, common_1.Controller)('payrolls'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [payrolls_service_1.PayrollsService])
], PayrollsController);
//# sourceMappingURL=payrolls.controller.js.map