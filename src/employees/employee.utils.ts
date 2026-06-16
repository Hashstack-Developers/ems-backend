import { Employee } from './entities/employee.entity';

export function getEmployeeFullName(employee: Pick<Employee, 'name'>): string {
  return employee.name;
}

export function getEmployeePayrollGross(employee: Employee): number {
  if (employee.grossSalary != null && Number(employee.grossSalary) > 0) {
    return Number(employee.grossSalary);
  }
  if (employee.basicPayDec2025 != null && Number(employee.basicPayDec2025) > 0) {
    return Number(employee.basicPayDec2025);
  }
  return 0;
}

export function computeRetirementDate(dateOfBirth: string): string {
  const dob = new Date(dateOfBirth);
  const retirement = new Date(dob);
  retirement.setFullYear(retirement.getFullYear() + 60);
  return retirement.toISOString().slice(0, 10);
}

export function computeLengthOfService(dateOfJoining: string): string {
  const join = new Date(dateOfJoining);
  const now = new Date();
  let years = now.getFullYear() - join.getFullYear();
  let months = now.getMonth() - join.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years === 1 ? '' : 's'}`);
  if (months > 0) parts.push(`${months} month${months === 1 ? '' : 's'}`);
  return parts.length > 0 ? parts.join(', ') : 'Less than 1 month';
}
