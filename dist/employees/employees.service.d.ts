import { Repository } from 'typeorm';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Employee } from './entities/employee.entity';
export declare class EmployeesService {
    private readonly employeesRepository;
    constructor(employeesRepository: Repository<Employee>);
    create(dto: CreateEmployeeDto): Promise<Employee>;
    findAll(): Promise<Employee[]>;
    findOne(id: number): Promise<Employee>;
    update(id: number, dto: UpdateEmployeeDto): Promise<Employee>;
    remove(id: number): Promise<void>;
    findActiveEmployees(): Promise<Employee[]>;
    count(): Promise<number>;
    countActive(): Promise<number>;
    private ensureUniqueFields;
}
