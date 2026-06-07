import { EmployeeStatus } from '../entities/employee.entity';
export declare class CreateEmployeeDto {
    employeeCode: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    department: string;
    designation: string;
    basicSalary: number;
    joinDate: string;
    status?: EmployeeStatus;
}
