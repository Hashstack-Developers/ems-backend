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
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { CreateGpFundRecordDto } from './dto/create-gp-fund-record.dto';
import { UpdateGpFundRecordDto } from './dto/update-gp-fund-record.dto';
import { GpFundService } from './gp-fund.service';

@Controller('gp-fund')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class GpFundController {
  constructor(private readonly gpFundService: GpFundService) {}

  @Get()
  @RequirePermissions('gpFund.view')
  async findAll() {
    const data = await this.gpFundService.findAll();
    return { success: true, data };
  }

  @Get('suggested-collection/:year')
  @RequirePermissions('gpFund.view')
  async getSuggestedCollection(@Param('year', ParseIntPipe) year: number) {
    const data = await this.gpFundService.getSuggestedTaxCollection(year);
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

  @Delete(':id')
  @RequirePermissions('gpFund.delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const data = await this.gpFundService.remove(id);
    return { success: true, data };
  }
}
