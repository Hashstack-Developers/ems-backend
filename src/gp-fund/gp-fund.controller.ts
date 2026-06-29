import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { CreateGpFundScaleDto } from './dto/create-gp-fund-scale.dto';
import { CreateGpFundRecordDto } from './dto/create-gp-fund-record.dto';
import { GpFundOverviewQueryDto } from './dto/gp-fund-overview-query.dto';
import { UpdateGpFundScaleDto } from './dto/update-gp-fund-scale.dto';
import { UpdateGpFundMarkupDto } from './dto/update-gp-fund-markup.dto';
import { UpdateGpFundRecordDto } from './dto/update-gp-fund-record.dto';
import { CreateGpFundAdvanceDto } from './dto/create-gp-fund-advance.dto';
import { GpFundAdvanceQueryDto } from './dto/gp-fund-advance-query.dto';
import { GpFundOverviewService } from './gp-fund-overview.service';
import { GpFundAdvanceService } from './gp-fund-advance.service';
import { GpFundService } from './gp-fund.service';

@Controller('gp-fund')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class GpFundController {
  constructor(
    private readonly gpFundService: GpFundService,
    private readonly gpFundAdvanceService: GpFundAdvanceService,
    private readonly gpFundOverviewService: GpFundOverviewService,
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
