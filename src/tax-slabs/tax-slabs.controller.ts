import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { CreateSubTaxDto } from './dto/create-sub-tax.dto';
import { CreateTaxSlabDto } from './dto/create-tax-slab.dto';
import { TaxOverviewQueryDto } from './dto/tax-overview-query.dto';
import { UpdateSubTaxDto } from './dto/update-sub-tax.dto';
import { UpdateTaxSlabDto } from './dto/update-tax-slab.dto';
import { TaxOverviewService } from './tax-overview.service';
import { TaxSlabsService } from './tax-slabs.service';

@Controller('tax-slabs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TaxSlabsController {
  constructor(
    private readonly taxSlabsService: TaxSlabsService,
    private readonly taxOverviewService: TaxOverviewService,
  ) {}

  @Post(':slabId/sub-taxes')
  @RequirePermissions('taxes.create')
  async createSubTax(
    @Param('slabId', ParseIntPipe) slabId: number,
    @Body() dto: CreateSubTaxDto,
  ) {
    const data = await this.taxSlabsService.createSubTax(slabId, dto);
    return { success: true, data };
  }

  @Get(':slabId/sub-taxes')
  @RequirePermissions('taxes.view')
  async findSubTaxesBySlab(@Param('slabId', ParseIntPipe) slabId: number) {
    const data = await this.taxSlabsService.findSubTaxesBySlab(slabId);
    return { success: true, data };
  }

  @Get(':slabId/sub-taxes/:id')
  @RequirePermissions('taxes.view')
  async findOneSubTax(
    @Param('slabId', ParseIntPipe) slabId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const data = await this.taxSlabsService.findOneSubTax(slabId, id);
    return { success: true, data };
  }

  @Patch(':slabId/sub-taxes/:id')
  @RequirePermissions('taxes.update')
  async updateSubTax(
    @Param('slabId', ParseIntPipe) slabId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubTaxDto,
  ) {
    const data = await this.taxSlabsService.updateSubTax(slabId, id, dto);
    return { success: true, data };
  }

  @Delete(':slabId/sub-taxes/:id')
  @RequirePermissions('taxes.delete')
  async removeSubTax(
    @Param('slabId', ParseIntPipe) slabId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.taxSlabsService.removeSubTax(slabId, id);
    return { success: true, message: 'Sub-tax deleted successfully' };
  }

  @Post()
  @RequirePermissions('taxes.create')
  async createTaxSlab(@Body() dto: CreateTaxSlabDto) {
    const data = await this.taxSlabsService.createTaxSlab(dto);
    return { success: true, data };
  }

  @Get('overview')
  @RequirePermissions('taxes.view')
  async getOverview(@Query() query: TaxOverviewQueryDto) {
    const data = await this.taxOverviewService.getOverview(query);
    return { success: true, data };
  }

  @Get()
  @RequirePermissions('taxes.view')
  async findAllTaxSlabs() {
    const data = await this.taxSlabsService.findAllTaxSlabs();
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermissions('taxes.view')
  async findOneTaxSlab(@Param('id', ParseIntPipe) id: number) {
    const data = await this.taxSlabsService.findOneTaxSlab(id);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermissions('taxes.update')
  async updateTaxSlab(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaxSlabDto,
  ) {
    const data = await this.taxSlabsService.updateTaxSlab(id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermissions('taxes.delete')
  async removeTaxSlab(@Param('id', ParseIntPipe) id: number) {
    await this.taxSlabsService.removeTaxSlab(id);
    return { success: true, message: 'Tax slab deleted successfully' };
  }
}
