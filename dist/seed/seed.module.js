"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const employee_entity_1 = require("../employees/entities/employee.entity");
const employees_module_1 = require("../employees/employees.module");
const gp_fund_module_1 = require("../gp-fund/gp-fund.module");
const payrolls_module_1 = require("../payrolls/payrolls.module");
const demo_data_seed_1 = require("./demo-data.seed");
let SeedModule = class SeedModule {
};
exports.SeedModule = SeedModule;
exports.SeedModule = SeedModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([employee_entity_1.Employee]),
            employees_module_1.EmployeesModule,
            payrolls_module_1.PayrollsModule,
            gp_fund_module_1.GpFundModule,
        ],
        providers: [demo_data_seed_1.DemoDataSeedService],
        exports: [demo_data_seed_1.DemoDataSeedService],
    })
], SeedModule);
//# sourceMappingURL=seed.module.js.map