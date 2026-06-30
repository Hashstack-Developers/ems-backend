import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { CreateGpFundScaleDto } from './dto/create-gp-fund-scale.dto';
import { CreateGpFundRecordDto } from './dto/create-gp-fund-record.dto';
import { DownloadGpFundReportsZipDto } from './dto/download-gp-fund-reports-zip.dto';
import { GenerateGpFundReportDto } from './dto/generate-gp-fund-report.dto';
import { GpFundOverviewQueryDto } from './dto/gp-fund-overview-query.dto';
import { UpdateGpFundScaleDto } from './dto/update-gp-fund-scale.dto';
import { UpdateGpFundMarkupDto } from './dto/update-gp-fund-markup.dto';
import { UpdateGpFundRecordDto } from './dto/update-gp-fund-record.dto';
import { CreateGpFundAdvanceDto } from './dto/create-gp-fund-advance.dto';
import { GpFundAdvanceQueryDto } from './dto/gp-fund-advance-query.dto';
import { GpFundOverviewService } from './gp-fund-overview.service';
import { GpFundAdvanceService } from './gp-fund-advance.service';
import { GpFundReportsService } from './gp-fund-reports.service';
import { GpFundService } from './gp-fund.service';

@Controller('gp-fund')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class GpFundController {
  constructor(
    private readonly gpFundService: GpFundService,
    private readonly gpFundAdvanceService: GpFundAdvanceService,
    private readonly gpFundOverviewService: GpFundOverviewService,
    private readonly gpFundReportsService: GpFundReportsService,
  ) {}

  @Get()
  @RequirePermissions('gpFund.view')
  async findAll() {
    const data = await this.gpFundService.findAll();
    return { success: true, data };
  }

  @Get('scales')
  @RequirePermissions('gpFund.view')
  async findAllScales() {
    const data = await this.gpFundService.findAllScales();
    return { success: true, data };
  }

  @Post('scales')
  @RequirePermissions('gpFund.create')
  async createScale(@Body() dto: CreateGpFundScaleDto) {
    const data = await this.gpFundService.createScale(dto);
    return { success: true, data };
  }

  @Get('suggested-collection/:year')
  @RequirePermissions('gpFund.view')
  async getSuggestedCollection(@Param('year', ParseIntPipe) year: number) {
    const data = await this.gpFundService.getSuggestedTaxCollection(year);
    return { success: true, data };
  }

  @Get('markups')
  @RequirePermissions('gpFund.view')
  async getMarkups() {
    const data = await this.gpFundService.getMarkupSettings();
    return { success: true, data };
  }

  @Patch('markups')
  @RequirePermissions('gpFund.update')
  async updateMarkups(@Body() dto: UpdateGpFundMarkupDto) {
    const data = await this.gpFundService.updateMarkupSettings(dto);
    return { success: true, data };
  }

  @Get('advances/summary')
  @RequirePermissions('gpFund.view')
  async getAdvanceSummary() {
    const data = await this.gpFundAdvanceService.getSummary();
    return { success: true, data };
  }

  @Get('advances')
  @RequirePermissions('gpFund.view')
  async findAllAdvances(@Query() query: GpFundAdvanceQueryDto) {
    const advances = await this.gpFundAdvanceService.findAll(query);
    const data = advances.map((advance) => this.gpFundAdvanceService.mapAdvanceRow(advance));
    return { success: true, data };
  }

  @Get('advances/employee/:employeeId/active')
  @RequirePermissions('gpFund.view')
  async findActiveAdvanceForEmployee(
    @Param('employeeId', ParseIntPipe) employeeId: number,
  ) {
    const advance = await this.gpFundAdvanceService.findActiveForEmployee(employeeId);
    const data = advance ? this.gpFundAdvanceService.mapAdvanceRow(advance) : null;
    return { success: true, data };
  }

  @Post('advances')
  @RequirePermissions('gpFund.create')
  async createAdvance(@Body() dto: CreateGpFundAdvanceDto) {
    const advance = await this.gpFundAdvanceService.create(dto);
    const data = this.gpFundAdvanceService.mapAdvanceRow(advance);
    return { success: true, data };
  }

  @Patch('advances/:id/cancel')
  @RequirePermissions('gpFund.update')
  async cancelAdvance(@Param('id', ParseIntPipe) id: number) {
    const advance = await this.gpFundAdvanceService.cancel(id);
    const data = this.gpFundAdvanceService.mapAdvanceRow(advance);
    return { success: true, data };
  }

  @Delete('advances/:id')
  @RequirePermissions('gpFund.delete')
  async removeAdvance(@Param('id', ParseIntPipe) id: number) {
    const data = await this.gpFundAdvanceService.remove(id);
    return { success: true, data };
  }

  @Get('overview')
  @RequirePermissions('gpFund.view')
  async getOverview(@Query() query: GpFundOverviewQueryDto) {
    const data = await this.gpFundOverviewService.getOverview(query);
    return { success: true, data };
  }

  @Get('reports')
  @RequirePermissions('gpFund.view')
  async getReportAvailability(@Query() query: GpFundOverviewQueryDto) {
    const data = await this.gpFundReportsService.getAvailability(query);
    return { success: true, data };
  }

  @Post('reports/generate')
  @RequirePermissions('gpFund.generate')
  async generateReport(@Body() dto: GenerateGpFundReportDto) {
    const data = await this.gpFundReportsService.generate(dto);
    return { success: true, data };
  }

  @Post('reports/download/zip')
  @RequirePermissions('gpFund.export')
  async downloadReportsZip(@Body() dto: DownloadGpFundReportsZipDto, @Res() res: Response) {
    const employees = await this.gpFundReportsService.resolveDownloadEmployees(dto);
    const selected = !!(dto.employeeIds && dto.employeeIds.length > 0);
    const filename = this.gpFundReportsService.buildZipFilename(dto, selected);
    const archive = this.gpFundReportsService.createZipArchive();
    const { added, failures } = await this.gpFundReportsService.appendEmployeesToArchive(
      archive,
      employees,
      { years: dto.years, months: dto.months },
    );

    if (added === 0) {
      throw new BadRequestException(
        failures[0] ?? 'No GP fund reports could be generated for download',
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

  @Get('reports/:employeeId/pdf')
  @RequirePermissions('gpFund.export')
  async downloadReportPdf(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Query() query: GpFundOverviewQueryDto,
    @Res() res: Response,
  ) {
    const result = await this.gpFundReportsService.generatePdf(employeeId, query);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  }

  @Get(':id')
  @RequirePermissions('gpFund.view')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.gpFundService.findOne(id);
    return { success: true, data };
  }

  @Post()
  @RequirePermissions('gpFund.create')
  async create(@Body() dto: CreateGpFundRecordDto) {
    const data = await this.gpFundService.create(dto);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermissions('gpFund.update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGpFundRecordDto,
  ) {
    const data = await this.gpFundService.update(id, dto);
    return { success: true, data };
  }

  @Patch('scales/:id')
  @RequirePermissions('gpFund.update')
  async updateScale(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGpFundScaleDto,
  ) {
    const data = await this.gpFundService.updateScale(id, dto);
    return { success: true, data };
  }

  @Delete('scales/:id')
  @RequirePermissions('gpFund.delete')
  async removeScale(@Param('id', ParseIntPipe) id: number) {
    const data = await this.gpFundService.removeScale(id);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermissions('gpFund.delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const data = await this.gpFundService.remove(id);
    return { success: true, data };
  }
}
