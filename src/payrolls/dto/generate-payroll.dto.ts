import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class GeneratePayrollDto {
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  employeeId?: number;
}
