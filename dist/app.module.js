"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const auth_module_1 = require("./auth/auth.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const gp_fund_module_1 = require("./gp-fund/gp-fund.module");
const gp_fund_record_entity_1 = require("./gp-fund/entities/gp-fund-record.entity");
const employee_entity_1 = require("./employees/entities/employee.entity");
const employees_module_1 = require("./employees/employees.module");
const payroll_deduction_entity_1 = require("./payrolls/entities/payroll-deduction.entity");
const payroll_entity_1 = require("./payrolls/entities/payroll.entity");
const payrolls_module_1 = require("./payrolls/payrolls.module");
const reports_module_1 = require("./reports/reports.module");
const sub_tax_entity_1 = require("./tax-slabs/entities/sub-tax.entity");
const tax_slab_entity_1 = require("./tax-slabs/entities/tax-slab.entity");
const tax_slabs_module_1 = require("./tax-slabs/tax-slabs.module");
const user_entity_1 = require("./users/entities/user.entity");
const users_module_1 = require("./users/users.module");
const seed_module_1 = require("./seed/seed.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    type: 'mysql',
                    host: configService.get('DB_HOST', 'localhost'),
                    port: configService.get('DB_PORT', 3306),
                    username: configService.get('DB_USERNAME', 'ems_user'),
                    password: configService.get('DB_PASSWORD', 'ems_password'),
                    database: configService.get('DB_DATABASE', 'employee_management'),
                    entities: [user_entity_1.User, employee_entity_1.Employee, tax_slab_entity_1.TaxSlab, sub_tax_entity_1.SubTax, payroll_entity_1.Payroll, payroll_deduction_entity_1.PayrollDeduction, gp_fund_record_entity_1.GpFundRecord],
                    synchronize: true,
                    logging: configService.get('NODE_ENV') === 'development',
                }),
            }),
            users_module_1.UsersModule,
            auth_module_1.AuthModule,
            employees_module_1.EmployeesModule,
            tax_slabs_module_1.TaxSlabsModule,
            payrolls_module_1.PayrollsModule,
            gp_fund_module_1.GpFundModule,
            dashboard_module_1.DashboardModule,
            reports_module_1.ReportsModule,
            seed_module_1.SeedModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map