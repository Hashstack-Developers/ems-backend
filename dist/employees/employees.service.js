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
exports.EmployeesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const employee_entity_1 = require("./entities/employee.entity");
let EmployeesService = class EmployeesService {
    employeesRepository;
    constructor(employeesRepository) {
        this.employeesRepository = employeesRepository;
    }
    async create(dto) {
        await this.ensureUniqueFields(dto.employeeCode, dto.email);
        const employee = this.employeesRepository.create({
            ...dto,
            status: dto.status ?? employee_entity_1.EmployeeStatus.ACTIVE,
        });
        return this.employeesRepository.save(employee);
    }
    async findAll() {
        return this.employeesRepository.find({ order: { createdAt: 'DESC' } });
    }
    async findOne(id) {
        const employee = await this.employeesRepository.findOne({ where: { id } });
        if (!employee) {
            throw new common_1.NotFoundException(`Employee with ID ${id} not found`);
        }
        return employee;
    }
    async update(id, dto) {
        const employee = await this.findOne(id);
        if (dto.employeeCode && dto.employeeCode !== employee.employeeCode) {
            const existing = await this.employeesRepository.findOne({
                where: { employeeCode: dto.employeeCode },
            });
            if (existing) {
                throw new common_1.ConflictException('Employee code already exists');
            }
        }
        if (dto.email && dto.email !== employee.email) {
            const existing = await this.employeesRepository.findOne({
                where: { email: dto.email },
            });
            if (existing) {
                throw new common_1.ConflictException('Email already exists');
            }
        }
        Object.assign(employee, dto);
        return this.employeesRepository.save(employee);
    }
    async remove(id) {
        const employee = await this.findOne(id);
        await this.employeesRepository.remove(employee);
    }
    async findActiveEmployees() {
        return this.employeesRepository.find({
            where: { status: employee_entity_1.EmployeeStatus.ACTIVE },
            order: { firstName: 'ASC' },
        });
    }
    async count() {
        return this.employeesRepository.count();
    }
    async countActive() {
        return this.employeesRepository.count({
            where: { status: employee_entity_1.EmployeeStatus.ACTIVE },
        });
    }
    async ensureUniqueFields(employeeCode, email) {
        const existingCode = await this.employeesRepository.findOne({
            where: { employeeCode },
        });
        if (existingCode) {
            throw new common_1.ConflictException('Employee code already exists');
        }
        const existingEmail = await this.employeesRepository.findOne({
            where: { email },
        });
        if (existingEmail) {
            throw new common_1.ConflictException('Email already exists');
        }
    }
};
exports.EmployeesService = EmployeesService;
exports.EmployeesService = EmployeesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(employee_entity_1.Employee)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], EmployeesService);
//# sourceMappingURL=employees.service.js.map