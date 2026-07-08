import {
  Body,
  Controller,
  Delete,
  Get,
  BadRequestException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { GeneratePayrollDto } from './dto/generate-payroll.dto';
import { PayrollsService } from './payrolls.service';

@Controller('payrolls')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PayrollsController {
  constructor(private readonly payrollsService: PayrollsService) {}

  @Post('generate')
  @RequirePermissions('payrolls.generate')
  async generate(@Body() dto: GeneratePayrollDto) {
    const data = await this.payrollsService.generate(dto);
    return {
      success: true,
      message: this.payrollsService.buildGenerationMessage(data, !!dto.employeeId),
      data,
    };
  }

  @Get('employee-holds')
  @RequirePermissions('payrolls.generate')
  async getEmployeeHolds() {
    const data = await this.payrollsService.getEmployeeHolds();
    return { success: true, data };
  }

  @Get('generation-status')
  @RequirePermissions('payrolls.view')
  async getGenerationStatus(
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    if (!month || !year) {
      throw new BadRequestException('Month and year are required');
    }

    const data = await this.payrollsService.getGenerationStatus(
      parseInt(month, 10),
      parseInt(year, 10),
    );
    return { success: true, data };
  }

  @Get('summary')
  @RequirePermissions('payrolls.view')
  async getSummary(
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const data = await this.payrollsService.getSummary(
      month ? parseInt(month, 10) : undefined,
      year ? parseInt(year, 10) : undefined,
    );
    return { success: true, data };
  }

  @Get()
  @RequirePermissions('payrolls.view')
  async findAll(
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const data = await this.payrollsService.findAll(
      month ? parseInt(month, 10) : undefined,
      year ? parseInt(year, 10) : undefined,
    );
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermissions('payrolls.view')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.payrollsService.findOne(id);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermissions('payrolls.delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.payrollsService.remove(id);
    return { success: true, message: 'Payroll deleted successfully' };
  }
}
