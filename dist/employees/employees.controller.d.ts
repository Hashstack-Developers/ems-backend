import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';
export declare class EmployeesController {
    private readonly employeesService;
    constructor(employeesService: EmployeesService);
    create(dto: CreateEmployeeDto): Promise<{
        success: boolean;
        data: import("./entities/employee.entity").Employee;
    }>;
    findAll(): Promise<{
        success: boolean;
        data: import("./entities/employee.entity").Employee[];
    }>;
    findOne(id: number): Promise<{
        success: boolean;
        data: import("./entities/employee.entity").Employee;
    }>;
    update(id: number, dto: UpdateEmployeeDto): Promise<{
        success: boolean;
        data: import("./entities/employee.entity").Employee;
    }>;
    remove(id: number): Promise<{
        success: boolean;
        message: string;
    }>;
}
