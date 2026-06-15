import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RbacDataMigrationService } from '../database/rbac-data-migration.service';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { PermissionsGuard } from './guards/permissions.guard';
import { SuperRoleGuard } from './guards/super-role.guard';
import { RolesController } from './roles.controller';
import { RbacSeedService } from './rbac.seed';
import { RbacService } from './rbac.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, Permission, User]),
    forwardRef(() => UsersModule),
  ],
  controllers: [RolesController],
  providers: [RbacService, RbacSeedService, RbacDataMigrationService, PermissionsGuard, SuperRoleGuard],
  exports: [RbacService, PermissionsGuard, SuperRoleGuard, TypeOrmModule],
})
export class RbacModule {}
