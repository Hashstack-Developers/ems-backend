import { Payroll } from '../../payrolls/entities/payroll.entity';
export declare enum EmployeeStatus {
    ACTIVE = "active",
    INACTIVE = "inactive"
}
export declare class Employee {
    id: number;
    employeeCode: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    department: string;
    designation: string;
    basicSalary: number;
    joinDate: string;
    status: EmployeeStatus;
    payrolls: Payroll[];
    createdAt: Date;
    updatedAt: Date;
}
