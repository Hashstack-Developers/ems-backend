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
import { RequireSuperRole } from '../rbac/decorators/require-super-role.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { SuperRoleGuard } from '../rbac/guards/super-role.guard';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, SuperRoleGuard, PermissionsGuard)
@RequireSuperRole()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('users.view')
  async findAll(@Query('role') role?: string) {
    const users = await this.usersService.findAll(role);
    return {
      success: true,
      data: users.map((user) => this.usersService.toPublicUser(user)),
    };
  }

  @Get(':id')
  @RequirePermissions('users.view')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findById(id);
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    return {
      success: true,
      data: this.usersService.toPublicUser(user),
    };
  }

  @Post()
  @RequirePermissions('users.create')
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.createUser(dto);
    return {
      success: true,
      data: this.usersService.toPublicUser(user),
    };
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    const user = await this.usersService.updateUser(id, dto);
    return {
      success: true,
      data: this.usersService.toPublicUser(user),
    };
  }

  @Patch(':id/deactivate')
  @RequirePermissions('users.deactivate')
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.deactivateUser(id);
    return {
      success: true,
      data: this.usersService.toPublicUser(user),
    };
  }

  @Patch(':id/activate')
  @RequirePermissions('users.deactivate')
  async activate(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.activateUser(id);
    return {
      success: true,
      data: this.usersService.toPublicUser(user),
    };
  }

  @Delete(':id')
  @RequirePermissions('users.delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.usersService.deleteUser(id);
    return { success: true, message: 'User deleted successfully' };
  }
}
