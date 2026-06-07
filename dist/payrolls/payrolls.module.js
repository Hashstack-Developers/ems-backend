"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const employees_module_1 = require("../employees/employees.module");
const tax_slabs_module_1 = require("../tax-slabs/tax-slabs.module");
const payroll_deduction_entity_1 = require("./entities/payroll-deduction.entity");
const payroll_entity_1 = require("./entities/payroll.entity");
const payrolls_controller_1 = require("./payrolls.controller");
const payrolls_service_1 = require("./payrolls.service");
const salary_slips_controller_1 = require("./salary-slips.controller");
const salary_slips_service_1 = require("./salary-slips.service");
let PayrollsModule = class PayrollsModule {
};
exports.PayrollsModule = PayrollsModule;
exports.PayrollsModule = PayrollsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([payroll_entity_1.Payroll, payroll_deduction_entity_1.PayrollDeduction]),
            employees_module_1.EmployeesModule,
            tax_slabs_module_1.TaxSlabsModule,
        ],
        controllers: [payrolls_controller_1.PayrollsController, salary_slips_controller_1.SalarySlipsController],
        providers: [payrolls_service_1.PayrollsService, salary_slips_service_1.SalarySlipsService],
        exports: [payrolls_service_1.PayrollsService, salary_slips_service_1.SalarySlipsService],
    })
], PayrollsModule);
//# sourceMappingURL=payrolls.module.js.map