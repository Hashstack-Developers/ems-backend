import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const GP_FUND_ADVANCE_MAX_MONTHS = 36;

export class CreateGpFundAdvanceDto {
  @IsInt()
  @Min(1)
  employeeId: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  advanceAmount: number;

  @IsInt()
  @Min(1)
  @Max(GP_FUND_ADVANCE_MAX_MONTHS)
  installmentMonths: number;

  @IsDateString()
  takenDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
