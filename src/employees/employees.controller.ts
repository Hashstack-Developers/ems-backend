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
import { IsBoolean } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';

class SetPayrollHoldDto {
  @IsBoolean()
  onHold!: boolean;
}

@Controller('employees')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @RequirePermissions('employees.create')
  async create(@Body() dto: CreateEmployeeDto) {
    console.log('[CONTROLLER] POST /employees - Create employee request received');
    console.log('[CONTROLLER] Request body:', {
      name: dto.name,
      email: dto.email,
      cnicNo: dto.cnicNo,
      dateOfJoining: dto.dateOfJoining,
    });
    try {
      console.log('[CONTROLLER] Calling employeesService.create()');
      const data = await this.employeesService.create(dto);
      console.log('[CONTROLLER] Employee created successfully with ID:', data.id);
      return { success: true, data };
    } catch (error) {
      console.error('[CONTROLLER] Error creating employee:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  @Get()
  @RequirePermissions('employees.view')
  async findAll() {
    const data = await this.employeesService.findAll();
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermissions('employees.view')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.employeesService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermissions('employees.update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
  ) {
    const data = await this.employeesService.update(id, dto);
    return { success: true, data };
  }

  @Patch(':id/payroll-hold')
  @RequirePermissions('payrolls.generate')
  async setPayrollHold(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetPayrollHoldDto,
  ) {
    await this.employeesService.setPayrollHold(id, dto.onHold);
    return { success: true, message: dto.onHold ? 'Payroll hold enabled' : 'Payroll hold removed' };
  }

  @Delete(':id')
  @RequirePermissions('employees.delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.employeesService.remove(id);
    return { success: true, message: 'Employee deleted successfully' };
  }
}
