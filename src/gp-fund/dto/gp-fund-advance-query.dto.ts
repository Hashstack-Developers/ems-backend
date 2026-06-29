import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { GpFundAdvanceStatus } from '../entities/gp-fund-advance.entity';

export class GpFundAdvanceQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  employeeId?: number;

  @IsOptional()
  @IsEnum(GpFundAdvanceStatus)
  status?: GpFundAdvanceStatus;
}
