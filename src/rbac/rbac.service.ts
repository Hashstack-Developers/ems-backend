import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { NoChangesException } from '../common/exceptions/no-changes.exception';
import { stringArraysEqualAsSet } from '../common/utils/change-detection';
import { DEFAULT_ROLE_PERMISSIONS, SYSTEM_ROLES, SYSTEM_ROLE_DEFINITIONS } from './constants/roles.constants';
import { PERMISSION_DEFINITIONS } from './constants/permissions.constants';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
  ) {}

  async findAllPermissions(): Promise<Permission[]> {
    return this.permissionsRepository.find({ order: { module: 'ASC', action: 'ASC' } });
  }

  async findAllRoles(): Promise<Role[]> {
    return this.rolesRepository.find({ order: { name: 'ASC' } });
  }

  async findRoleByName(name: string): Promise<Role | null> {
    return this.rolesRepository.findOne({ where: { name } });
  }

  async findRoleById(id: number): Promise<Role | null> {
    return this.rolesRepository.findOne({ where: { id } });
  }

  async getRolePermissionKeys(roleId: number): Promise<string[]> {
    const role = await this.findRoleById(roleId);
    return role?.permissions.map((p) => p.key) ?? [];
  }

  async updateRolePermissions(roleId: number, permissionKeys: string[]): Promise<Role> {
    const role = await this.rolesRepository.findOne({
      where: { id: roleId },
      relations: { permissions: true },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.name === SYSTEM_ROLES.SUPER) {
      throw new BadRequestException('Super role permissions cannot be modified');
    }

    const currentKeys = role.permissions.map((permission) => permission.key);
    if (stringArraysEqualAsSet(currentKeys, permissionKeys)) {
      throw new NoChangesException();
    }

    const permissions = await this.permissionsRepository.find({
      where: { key: In(permissionKeys) },
    });

    role.permissions = permissions;
    return this.rolesRepository.save(role);
  }

  async ensurePermissionsExist(): Promise<Map<string, Permission>> {
    const permissionMap = new Map<string, Permission>();

    for (const definition of PERMISSION_DEFINITIONS) {
      let permission = await this.permissionsRepository.findOne({
        where: { key: definition.key },
      });

      if (!permission) {
        permission = this.permissionsRepository.create({
          key: definition.key,
          module: definition.module,
          action: definition.action,
          description: definition.description,
        });
        permission = await this.permissionsRepository.save(permission);
      } else {
        permission.module = definition.module;
        permission.action = definition.action;
        permission.description = definition.description;
        permission = await this.permissionsRepository.save(permission);
      }

      permissionMap.set(definition.key, permission);
    }

    return permissionMap;
  }

  async ensureRolesExist(permissionMap: Map<string, Permission>): Promise<Map<string, Role>> {
    const roleMap = new Map<string, Role>();

    for (const definition of SYSTEM_ROLE_DEFINITIONS) {
      let role = await this.rolesRepository.findOne({
        where: { name: definition.name },
      });

      const defaultKeys = DEFAULT_ROLE_PERMISSIONS[definition.name];
      const permissions = defaultKeys
        .map((key) => permissionMap.get(key))
        .filter((p): p is Permission => !!p);

      if (!role) {
        role = this.rolesRepository.create({
          name: definition.name,
          label: definition.label,
          description: definition.description,
          isSystem: definition.isSystem,
          permissions,
        });
        role = await this.rolesRepository.save(role);
      } else {
        role.label = definition.label;
        role.description = definition.description;
        role.isSystem = definition.isSystem;

        if (definition.name === SYSTEM_ROLES.SUPER) {
          role.permissions = permissions;
        }

        role = await this.rolesRepository.save(role);
      }

      roleMap.set(definition.name, role);
    }

    return roleMap;
  }

  async syncDefaultRolePermissions(permissionMap: Map<string, Permission>): Promise<void> {
    for (const definition of SYSTEM_ROLE_DEFINITIONS) {
      if (definition.name === SYSTEM_ROLES.SUPER) {
        continue;
      }

      const role = await this.rolesRepository.findOne({
        where: { name: definition.name },
      });
      if (!role) {
        continue;
      }

      const existingKeys = new Set(role.permissions.map((p) => p.key));
      const defaultKeys = DEFAULT_ROLE_PERMISSIONS[definition.name];
      const missingKeys = defaultKeys.filter((key) => !existingKeys.has(key));

      if (missingKeys.length === 0) {
        continue;
      }

      const missingPermissions = missingKeys
        .map((key) => permissionMap.get(key))
        .filter((p): p is Permission => !!p);

      role.permissions = [...role.permissions, ...missingPermissions];
      await this.rolesRepository.save(role);
    }
  }
}
