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
import { GenerateSalarySlipDto } from './dto/generate-salary-slip.dto';
import { SalarySlipsService } from './salary-slips.service';

@Controller('salary-slips')
@UseGuards(JwtAuthGuard)
export class SalarySlipsController {
  constructor(private readonly salarySlipsService: SalarySlipsService) {}

  @Get()
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
  async generate(@Body() dto: GenerateSalarySlipDto) {
    const data = await this.salarySlipsService.generate(dto);
    return { success: true, data };
  }

  @Get(':payrollId/pdf')
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
