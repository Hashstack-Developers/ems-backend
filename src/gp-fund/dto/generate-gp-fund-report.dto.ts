import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class GenerateGpFundReportDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  employeeId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ each: true })
  years?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(12, { each: true })
  months?: number[];
}
