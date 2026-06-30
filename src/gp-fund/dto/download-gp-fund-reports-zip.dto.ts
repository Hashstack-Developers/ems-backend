import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

function parseCsvInts(value: unknown): number[] | undefined {
  if (value == null || value === '') return undefined;
  const raw = Array.isArray(value) ? value.join(',') : String(value);
  const parsed = raw
    .split(',')
    .map((part) => parseInt(part.trim(), 10))
    .filter((num) => !Number.isNaN(num));
  return parsed.length > 0 ? parsed : undefined;
}

export class DownloadGpFundReportsZipDto {
  @IsOptional()
  @Transform(({ value }) => parseCsvInts(value))
  @IsInt({ each: true })
  years?: number[];

  @IsOptional()
  @Transform(({ value }) => parseCsvInts(value))
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(12, { each: true })
  months?: number[];

  @IsOptional()
  @Transform(({ value }) => parseCsvInts(value))
  @IsInt({ each: true })
  @Min(1, { each: true })
  employeeIds?: number[];

  @IsOptional()
  @IsString()
  stage?: string;
}
