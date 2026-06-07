import { PartialType } from '@nestjs/mapped-types';
import { CreateTaxSlabDto } from './create-tax-slab.dto';

export class UpdateTaxSlabDto extends PartialType(CreateTaxSlabDto) {}
