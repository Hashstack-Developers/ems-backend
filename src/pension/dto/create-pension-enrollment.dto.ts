import { IsBoolean, IsDateString, IsPositive } from 'class-validator';

export class CreatePensionEnrollmentDto {
  @IsPositive()
  employeeId: number;

  @IsDateString()
  enrolledAt: string;
}

export class UpdatePensionEnrollmentDto {
  @IsBoolean()
  isActive: boolean;
}
