import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GeneratePayrollDto } from './dto/generate-payroll.dto';
import { PayrollsService } from './payrolls.service';

@Controller('payrolls')
@UseGuards(JwtAuthGuard)
export class PayrollsController {
  constructor(private readonly payrollsService: PayrollsService) {}

  @Post('generate')
  async generate(@Body() dto: GeneratePayrollDto) {
    const data = await this.payrollsService.generate(dto);
    return {
      success: true,
      message: `Generated ${data.length} payroll record(s)`,
      data,
    };
  }

  @Get('summary')
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
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.payrollsService.findOne(id);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.payrollsService.remove(id);
    return { success: true, message: 'Payroll deleted successfully' };
  }
}
