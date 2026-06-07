import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { EmployeesService } from '../employees/employees.service';
import { Employee } from '../employees/entities/employee.entity';
import { GpFundService } from '../gp-fund/gp-fund.service';
import { PayrollsService } from '../payrolls/payrolls.service';
export declare class DemoDataSeedService implements OnModuleInit {
    private readonly configService;
    private readonly employeesService;
    private readonly payrollsService;
    private readonly gpFundService;
    private readonly employeesRepository;
    private readonly logger;
    constructor(configService: ConfigService, employeesService: EmployeesService, payrollsService: PayrollsService, gpFundService: GpFundService, employeesRepository: Repository<Employee>);
    onModuleInit(): Promise<void>;
    seed(): Promise<void>;
    private seedEmployees;
    private seedPayrolls;
    private seedGpFund;
}
