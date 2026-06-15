import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RbacDataMigrationService } from '../database/rbac-data-migration.service';
import { RbacService } from './rbac.service';

@Injectable()
export class RbacSeedService implements OnModuleInit {
  private readonly logger = new Logger(RbacSeedService.name);

  constructor(
    private readonly rbacService: RbacService,
    private readonly rbacDataMigrationService: RbacDataMigrationService,
  ) {}

  async onModuleInit() {
    const permissionMap = await this.rbacService.ensurePermissionsExist();
    await this.rbacService.ensureRolesExist(permissionMap);
    await this.rbacService.syncDefaultRolePermissions(permissionMap);

    const repairedUsers = await this.rbacDataMigrationService.migrateUserRoleReferences();
    if (repairedUsers > 0) {
      this.logger.log(`Repaired role references for ${repairedUsers} user(s)`);
    }

    await this.rbacDataMigrationService.ensureUserRoleForeignKey();
    this.logger.log('RBAC roles, permissions, and user role references are ready');
  }
}
