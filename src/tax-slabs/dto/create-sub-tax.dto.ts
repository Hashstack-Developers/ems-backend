import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { SubTaxType } from '../entities/sub-tax.entity';

export class CreateSubTaxDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code: string;

  @IsEnum(SubTaxType)
  type: SubTaxType;

  @ValidateIf((o: CreateSubTaxDto) => o.type === SubTaxType.PERCENTAGE)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  rate?: number;

  @ValidateIf((o: CreateSubTaxDto) => o.type === SubTaxType.FIXED)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
