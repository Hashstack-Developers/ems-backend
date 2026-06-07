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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const employees_service_1 = require("../employees/employees.service");
const payrolls_service_1 = require("../payrolls/payrolls.service");
const tax_slabs_service_1 = require("../tax-slabs/tax-slabs.service");
let DashboardService = class DashboardService {
    employeesService;
    payrollsService;
    taxSlabsService;
    constructor(employeesService, payrollsService, taxSlabsService) {
        this.employeesService = employeesService;
        this.payrollsService = payrollsService;
        this.taxSlabsService = taxSlabsService;
    }
    async getStats() {
        const [totalEmployees, activeEmployees, taxSlabs, subTaxes, payrollByMonth,] = await Promise.all([
            this.employeesService.count(),
            this.employeesService.countActive(),
            this.taxSlabsService.findAllTaxSlabs(),
            this.taxSlabsService.findAllSubTaxes(),
            this.payrollsService.getMonthlySummaries(),
        ]);
        const payrollTotals = payrollByMonth.reduce((acc, p) => ({
            count: acc.count + p.count,
            totalGross: acc.totalGross + p.totalGross,
            totalDeductions: acc.totalDeductions + p.totalDeductions,
            totalNet: acc.totalNet + p.totalNet,
        }), { count: 0, totalGross: 0, totalDeductions: 0, totalNet: 0 });
        return {
            employees: {
                total: totalEmployees,
                active: activeEmployees,
                inactive: totalEmployees - activeEmployees,
            },
            taxes: {
                slabs: taxSlabs.length,
                activeSlabs: taxSlabs.filter((s) => s.isActive).length,
                subTaxes: subTaxes.length,
                activeSubTaxes: subTaxes.filter((s) => s.isActive).length,
            },
            payrollByMonth,
            payrollTotals: {
                monthsWithPayroll: payrollByMonth.length,
                ...payrollTotals,
            },
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [employees_service_1.EmployeesService,
        payrolls_service_1.PayrollsService,
        tax_slabs_service_1.TaxSlabsService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map