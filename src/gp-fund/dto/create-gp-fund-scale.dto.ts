import { IsNumber, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class CreateGpFundScaleDto {
  @IsString()
  @MaxLength(10)
  @Matches(/^B-\d+$/i, { message: 'Scale code must be like B-1' })
  code: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value?: number;
}
