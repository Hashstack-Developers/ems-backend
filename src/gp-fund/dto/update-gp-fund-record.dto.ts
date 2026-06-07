import { PartialType } from '@nestjs/mapped-types';
import { CreateGpFundRecordDto } from './create-gp-fund-record.dto';

export class UpdateGpFundRecordDto extends PartialType(CreateGpFundRecordDto) {}
