import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PensionSettingsService } from './pension-settings.service';
import { PensionEnrollmentService } from './pension-enrollment.service';
import { PensionOverviewService } from './pension-overview.service';
import { UpdatePensionSettingsDto } from './dto/update-pension-settings.dto';
import { CreatePensionEnrollmentDto } from './dto/create-pension-enrollment.dto';

@Controller('pension')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PensionController {
  constructor(
    private readonly settingsService: PensionSettingsService,
    private readonly enrollmentService: PensionEnrollmentService,
    private readonly overviewService: PensionOverviewService,
  ) {}

  @Get('settings')
  @RequirePermissions('pension.view')
  async getSettings() {
    return { success: true, data: await this.settingsService.getSettings() };
  }

  @Patch('settings')
  @RequirePermissions('pension.update')
  async updateSettings(@Body() dto: UpdatePensionSettingsDto) {
    return { success: true, data: await this.settingsService.updateSettings(dto.employeeRate, dto.employerRate) };
  }

  @Get('enrollments')
  @RequirePermissions('pension.view')
  async getEnrollments() {
    return { success: true, data: await this.enrollmentService.findAll() };
  }

  @Get('enrollments/employee/:employeeId')
  @RequirePermissions('pension.view')
  async getEmployeeEnrollment(@Param('employeeId', ParseIntPipe) employeeId: number) {
    return { success: true, data: await this.enrollmentService.findByEmployee(employeeId) };
  }

  @Post('enrollments')
  @RequirePermissions('pension.manage')
  async enroll(@Body() dto: CreatePensionEnrollmentDto) {
    return { success: true, data: await this.enrollmentService.enroll(dto) };
  }

  @Patch('enrollments/:employeeId/deactivate')
  @RequirePermissions('pension.manage')
  async deactivate(@Param('employeeId', ParseIntPipe) employeeId: number) {
    return { success: true, data: await this.enrollmentService.deactivate(employeeId) };
  }

  @Delete('enrollments/:employeeId')
  @RequirePermissions('pension.manage')
  async remove(@Param('employeeId', ParseIntPipe) employeeId: number) {
    await this.enrollmentService.remove(employeeId);
    return { success: true, data: null };
  }

  @Get('overview')
  @RequirePermissions('pension.view')
  async getOverview(
    @Query('years') years?: string,
    @Query('months') months?: string,
  ) {
    return {
      success: true, data: await this.overviewService.getOverview({
        years: years ? years.split(',').map(Number) : undefined,
        months: months ? months.split(',').map(Number) : undefined,
      }),
    };
  }

  @Get('dashboard')
  @RequirePermissions('pension.view')
  async getDashboard() {
    return { success: true, data: await this.overviewService.getDashboardSummary() };
  }
}
