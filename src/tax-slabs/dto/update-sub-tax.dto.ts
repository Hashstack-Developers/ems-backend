import { PartialType } from '@nestjs/mapped-types';
import { CreateSubTaxDto } from './create-sub-tax.dto';

export class UpdateSubTaxDto extends PartialType(CreateSubTaxDto) {}
