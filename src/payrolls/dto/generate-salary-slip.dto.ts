import { IsInt, Max, Min } from 'class-validator';

export class GenerateSalarySlipDto {
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @IsInt()
  @Min(1)
  employeeId: number;
}
