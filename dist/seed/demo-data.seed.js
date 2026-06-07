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
var DemoDataSeedService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemoDataSeedService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const employees_service_1 = require("../employees/employees.service");
const employee_entity_1 = require("../employees/entities/employee.entity");
const gp_fund_service_1 = require("../gp-fund/gp-fund.service");
const payrolls_service_1 = require("../payrolls/payrolls.service");
const demo_employees_data_1 = require("./demo-employees.data");
let DemoDataSeedService = DemoDataSeedService_1 = class DemoDataSeedService {
    configService;
    employeesService;
    payrollsService;
    gpFundService;
    employeesRepository;
    logger = new common_1.Logger(DemoDataSeedService_1.name);
    constructor(configService, employeesService, payrollsService, gpFundService, employeesRepository) {
        this.configService = configService;
        this.employeesService = employeesService;
        this.payrollsService = payrollsService;
        this.gpFundService = gpFundService;
        this.employeesRepository = employeesRepository;
    }
    async onModuleInit() {
        if (this.configService.get('SEED_DEMO_DATA') === 'true') {
            await this.seed();
        }
    }
    async seed() {
        this.logger.log('Starting demo data seed...');
        const employeesAdded = await this.seedEmployees();
        const { created: payrollsCreated, skipped: payrollsSkipped } = await this.seedPayrolls();
        const gpFundAdded = await this.seedGpFund();
        this.logger.log(`Demo seed complete — employees: +${employeesAdded}, payrolls: +${payrollsCreated} (skipped ${payrollsSkipped}), GP Fund years: +${gpFundAdded}`);
    }
    async seedEmployees() {
        const marker = await this.employeesRepository.findOne({
            where: { employeeCode: demo_employees_data_1.DEMO_MARKER_CODE },
        });
        if (marker) {
            this.logger.log('Demo employees already exist — skipping employee insert');
            return 0;
        }
        let added = 0;
        for (const dto of demo_employees_data_1.DEMO_EMPLOYEES) {
            await this.employeesService.create(dto);
            added++;
        }
        this.logger.log(`Created ${added} demo employees`);
        return added;
    }
    async seedPayrolls() {
        const activeEmployees = await this.employeesService.findActiveEmployees();
        let created = 0;
        let skipped = 0;
        for (const year of demo_employees_data_1.DEMO_PAYROLL_YEARS) {
            for (let month = 1; month <= 12; month++) {
                for (const employee of activeEmployees) {
                    try {
                        await this.payrollsService.generate({
                            month,
                            year,
                            employeeId: employee.id,
                        });
                        created++;
                    }
                    catch (error) {
                        if (error instanceof common_1.ConflictException) {
                            skipped++;
                            continue;
                        }
                        throw error;
                    }
                }
            }
        }
        this.logger.log(`Payrolls seeded for ${demo_employees_data_1.DEMO_PAYROLL_YEARS.join(', ')} — created ${created}, skipped ${skipped} existing`);
        return { created, skipped };
    }
    async seedGpFund() {
        let added = 0;
        for (const year of demo_employees_data_1.DEMO_GP_FUND_YEARS) {
            const existing = await this.gpFundService.findByYear(year);
            if (existing) {
                continue;
            }
            const { suggestedAmount } = await this.gpFundService.getSuggestedTaxCollection(year);
            const markupRate = 8;
            const markupTaxAmount = Math.round(suggestedAmount * (markupRate / 100) * 100) / 100;
            await this.gpFundService.create({
                year,
                yearlyTaxCollection: suggestedAmount,
                markupRate,
                markupTaxAmount,
            });
            added++;
            this.logger.log(`GP Fund ${year}: collection PKR ${suggestedAmount}, markup ${markupRate}%`);
        }
        return added;
    }
};
exports.DemoDataSeedService = DemoDataSeedService;
exports.DemoDataSeedService = DemoDataSeedService = DemoDataSeedService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(4, (0, typeorm_1.InjectRepository)(employee_entity_1.Employee)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        employees_service_1.EmployeesService,
        payrolls_service_1.PayrollsService,
        gp_fund_service_1.GpFundService,
        typeorm_2.Repository])
], DemoDataSeedService);
//# sourceMappingURL=demo-data.seed.js.map