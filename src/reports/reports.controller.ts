import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('download')
  @RequirePermissions('reports.export')
  async download(
    @Query('type') type: string,
    @Query('format') format: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Res() res?: Response,
  ) {
    const result = await this.reportsService.generate(
      type as 'employees' | 'payrolls' | 'taxes',
      format as 'csv' | 'pdf',
      month ? parseInt(month, 10) : undefined,
      year ? parseInt(year, 10) : undefined,
    );

    res!.setHeader('Content-Type', result.contentType);
    res!.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res!.send(result.buffer);
  }
}
