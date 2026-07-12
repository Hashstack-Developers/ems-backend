import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { AllowanceSettingsService } from './allowance-settings.service';
import { AllowanceOverviewService } from './allowance-overview.service';
import { UpdateAllowanceSettingsDto } from './dto/update-allowance-settings.dto';

@Controller('allowances')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AllowancesController {
  constructor(
    private readonly settingsService: AllowanceSettingsService,
    private readonly overviewService: AllowanceOverviewService,
  ) {}

  @Get('settings')
  @RequirePermissions('allowances.view')
  async getSettings() {
    return { success: true, data: await this.settingsService.getSettings() };
  }

  @Patch('settings')
  @RequirePermissions('allowances.update')
  async updateSettings(@Body() dto: UpdateAllowanceSettingsDto) {
    const data = await this.settingsService.updateSettings(dto.welfareRate, dto.managementRate);
    return { success: true, data };
  }

  @Get('overview')
  @RequirePermissions('allowances.view')
  async getOverview(
    @Query('type') type?: 'welfare' | 'management' | 'all',
    @Query('years') years?: string,
    @Query('months') months?: string,
  ) {
    const data = await this.overviewService.getOverview({
      type: type ?? 'all',
      years: years ? years.split(',').map(Number) : undefined,
      months: months ? months.split(',').map(Number) : undefined,
    });
    return { success: true, data };
  }

  @Get('dashboard')
  @RequirePermissions('allowances.view')
  async getDashboard() {
    return { success: true, data: await this.overviewService.getDashboardSummary() };
  }
}
