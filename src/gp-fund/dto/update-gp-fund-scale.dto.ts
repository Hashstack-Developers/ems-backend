import { IsNumber, Min } from 'class-validator';

export class UpdateGpFundScaleDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value: number;
}
