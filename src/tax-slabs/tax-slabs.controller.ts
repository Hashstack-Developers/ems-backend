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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSubTaxDto } from './dto/create-sub-tax.dto';
import { CreateTaxSlabDto } from './dto/create-tax-slab.dto';
import { UpdateSubTaxDto } from './dto/update-sub-tax.dto';
import { UpdateTaxSlabDto } from './dto/update-tax-slab.dto';
import { TaxSlabsService } from './tax-slabs.service';

@Controller('tax-slabs')
@UseGuards(JwtAuthGuard)
export class TaxSlabsController {
  constructor(private readonly taxSlabsService: TaxSlabsService) {}

  @Post(':slabId/sub-taxes')
  async createSubTax(
    @Param('slabId', ParseIntPipe) slabId: number,
    @Body() dto: CreateSubTaxDto,
  ) {
    const data = await this.taxSlabsService.createSubTax(slabId, dto);
    return { success: true, data };
  }

  @Get(':slabId/sub-taxes')
  async findSubTaxesBySlab(@Param('slabId', ParseIntPipe) slabId: number) {
    const data = await this.taxSlabsService.findSubTaxesBySlab(slabId);
    return { success: true, data };
  }

  @Get(':slabId/sub-taxes/:id')
  async findOneSubTax(
    @Param('slabId', ParseIntPipe) slabId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const data = await this.taxSlabsService.findOneSubTax(slabId, id);
    return { success: true, data };
  }

  @Patch(':slabId/sub-taxes/:id')
  async updateSubTax(
    @Param('slabId', ParseIntPipe) slabId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubTaxDto,
  ) {
    const data = await this.taxSlabsService.updateSubTax(slabId, id, dto);
    return { success: true, data };
  }

  @Delete(':slabId/sub-taxes/:id')
  async removeSubTax(
    @Param('slabId', ParseIntPipe) slabId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.taxSlabsService.removeSubTax(slabId, id);
    return { success: true, message: 'Sub-tax deleted successfully' };
  }

  @Post()
  async createTaxSlab(@Body() dto: CreateTaxSlabDto) {
    const data = await this.taxSlabsService.createTaxSlab(dto);
    return { success: true, data };
  }

  @Get()
  async findAllTaxSlabs() {
    const data = await this.taxSlabsService.findAllTaxSlabs();
    return { success: true, data };
  }

  @Get(':id')
  async findOneTaxSlab(@Param('id', ParseIntPipe) id: number) {
    const data = await this.taxSlabsService.findOneTaxSlab(id);
    return { success: true, data };
  }

  @Patch(':id')
  async updateTaxSlab(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaxSlabDto,
  ) {
    const data = await this.taxSlabsService.updateTaxSlab(id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  async removeTaxSlab(@Param('id', ParseIntPipe) id: number) {
    await this.taxSlabsService.removeTaxSlab(id);
    return { success: true, message: 'Tax slab deleted successfully' };
  }
}
