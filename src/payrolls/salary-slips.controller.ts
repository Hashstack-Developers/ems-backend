import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { GenerateSalarySlipDto } from './dto/generate-salary-slip.dto';
import { DownloadSalarySlipsZipDto } from './dto/download-salary-slips-zip.dto';
import { SalarySlipsService } from './salary-slips.service';

@Controller('salary-slips')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalarySlipsController {
  constructor(private readonly salarySlipsService: SalarySlipsService) {}

  @Get()
  @RequirePermissions('salarySlips.view')
  async getAvailability(
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    if (!month || !year) {
      throw new BadRequestException('Query params month and year are required');
    }
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (isNaN(m) || isNaN(y)) {
      throw new BadRequestException('Invalid month or year');
    }
    const data = await this.salarySlipsService.getAvailability(m, y);
    return { success: true, data };
  }

  @Post('generate')
  @RequirePermissions('salarySlips.generate')
  async generate(@Body() dto: GenerateSalarySlipDto) {
    const data = await this.salarySlipsService.generate(dto);
    return { success: true, data };
  }

  @Post('download/zip')
  @RequirePermissions('salarySlips.export')
  async downloadZip(@Body() dto: DownloadSalarySlipsZipDto, @Res() res: Response) {
    const payrolls = await this.salarySlipsService.resolveDownloadPayrolls(dto);
    const selected = !!(dto.payrollIds && dto.payrollIds.length > 0);
    const filename = this.salarySlipsService.buildZipFilename(
      dto.month,
      dto.year,
      selected,
    );

    const archive = this.salarySlipsService.createZipArchive();
    const { added, failures } = await this.salarySlipsService.appendPayrollsToArchive(
      archive,
      payrolls,
    );

    if (added === 0) {
      throw new BadRequestException(
        failures[0] ?? 'No salary slips could be generated for download',
      );
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader(
      'X-Download-Summary',
      JSON.stringify({
        added,
        failed: failures.length,
        messages: failures,
      }),
    );

    archive.on('error', (error) => {
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: error.message,
        });
        return;
      }

      res.end();
    });

    archive.pipe(res);
    await archive.finalize();
  }

  @Get(':payrollId/pdf')
  @RequirePermissions('salarySlips.export')
  async downloadPdf(
    @Param('payrollId', ParseIntPipe) payrollId: number,
    @Res() res: Response,
  ) {
    const result = await this.salarySlipsService.generatePdf(payrollId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.send(result.buffer);
  }
}
