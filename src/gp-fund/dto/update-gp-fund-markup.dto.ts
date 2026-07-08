import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateGpFundMarkupDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  annualMarkupRate?: number;
}
