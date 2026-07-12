import { IsNumber, Max, Min } from 'class-validator';

export class UpdateAllowanceSettingsDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  welfareRate!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  managementRate!: number;
}
