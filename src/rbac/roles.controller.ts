import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { RequirePermissions } from './decorators/require-permissions.decorator';
import { RequireSuperRole } from './decorators/require-super-role.decorator';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { PermissionsGuard } from './guards/permissions.guard';
import { SuperRoleGuard } from './guards/super-role.guard';
import { RbacService } from './rbac.service';

@Controller('roles')
@UseGuards(JwtAuthGuard, SuperRoleGuard, PermissionsGuard)
@RequireSuperRole()
export class RolesController {
  constructor(
    private readonly rbacService: RbacService,
    private readonly usersService: UsersService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  @Get()
  @RequirePermissions('roles.view')
  async findAll() {
    const roles = await this.rbacService.findAllRoles();
    return {
      success: true,
      data: roles.map((role) => ({
        id: role.id,
        name: role.name,
        label: role.label,
        description: role.description,
        isSystem: role.isSystem,
        permissions: role.permissions.map((p) => p.key),
        permissionCount: role.permissions.length,
      })),
    };
  }

  @Get('permissions')
  @RequirePermissions('roles.view')
  async findAllPermissions() {
    const permissions = await this.rbacService.findAllPermissions();
    return {
      success: true,
      data: permissions.map((p) => ({
        id: p.id,
        key: p.key,
        module: p.module,
        action: p.action,
        description: p.description,
      })),
    };
  }

  @Get(':id')
  @RequirePermissions('roles.view')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const role = await this.rbacService.findRoleById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const users = await this.usersRepository.find({
      where: { roleId: role.id },
      relations: { roleEntity: { permissions: true } },
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      data: {
        id: role.id,
        name: role.name,
        label: role.label,
        description: role.description,
        isSystem: role.isSystem,
        permissions: role.permissions.map((p) => p.key),
        users: users.map((user) => this.usersService.toPublicUser(user)),
      },
    };
  }

  @Patch(':id/permissions')
  @RequirePermissions('roles.update')
  async updatePermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    try {
      const role = await this.rbacService.updateRolePermissions(id, dto.permissions);
      return {
        success: true,
        data: {
          id: role.id,
          name: role.name,
          label: role.label,
          description: role.description,
          isSystem: role.isSystem,
          permissions: role.permissions.map((p) => p.key),
        },
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Super role')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
