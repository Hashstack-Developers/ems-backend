import {
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class CreateGpFundRecordDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  yearlyTaxCollection: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  markupRate?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  markupTaxAmount?: number;
}
