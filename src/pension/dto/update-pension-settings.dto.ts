import { IsNumber, Max, Min } from 'class-validator';

export class UpdatePensionSettingsDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  employeeRate: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  employerRate: number;
}
