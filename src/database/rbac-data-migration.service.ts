import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SYSTEM_ROLES } from '../rbac/constants/roles.constants';
import { RbacService } from '../rbac/rbac.service';
import { User } from '../users/entities/user.entity';

const USER_ROLE_FK_NAME = 'FK_users_role_id';

@Injectable()
export class RbacDataMigrationService {
  private readonly logger = new Logger(RbacDataMigrationService.name);

  constructor(
    private readonly rbacService: RbacService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async migrateUserRoleReferences(): Promise<number> {
    const emailRoleMappings = [
      {
        email: this.configService.get<string>('ADMIN_EMAIL') ?? 'admin@ems.local',
        roleName: SYSTEM_ROLES.ADMIN,
      },
      {
        email: this.configService.get<string>('SUPER_EMAIL') ?? 'superadmin@ems.online',
        roleName: SYSTEM_ROLES.SUPER,
      },
    ];

    let updated = 0;

    for (const mapping of emailRoleMappings) {
      const role = await this.rbacService.findRoleByName(mapping.roleName);
      const user = await this.usersRepository.findOne({ where: { email: mapping.email } });

      if (!role || !user) {
        continue;
      }

      if (user.roleId !== role.id) {
        await this.usersRepository.update(user.id, { roleId: role.id });
        this.logger.log(`Mapped ${mapping.email} -> ${mapping.roleName} (role_id=${role.id})`);
        updated += 1;
      }
    }

    const orphanCount = await this.countOrphanRoleReferences();
    if (orphanCount === 0) {
      return updated;
    }

    const fallbackRole =
      (await this.rbacService.findRoleByName(SYSTEM_ROLES.ADMIN)) ??
      (await this.rbacService.findRoleByName(SYSTEM_ROLES.SUPER));

    if (!fallbackRole) {
      throw new Error('Cannot repair orphaned user role references: no roles available');
    }

    const orphans: Array<{ id: number; email: string; role_id: number }> =
      await this.dataSource.query(`
        SELECT u.id, u.email, u.role_id
        FROM users u
        LEFT JOIN roles r ON r.id = u.role_id
        WHERE r.id IS NULL
      `);

    for (const orphan of orphans) {
      await this.usersRepository.update(orphan.id, { roleId: fallbackRole.id });
      this.logger.warn(
        `Repaired orphaned role_id=${orphan.role_id} for user ${orphan.email} -> ${fallbackRole.name}`,
      );
      updated += 1;
    }

    return updated;
  }

  async ensureUserRoleForeignKey(): Promise<void> {
    if (await this.userRoleForeignKeyExists()) {
      this.logger.log('users.role_id foreign key already exists');
      return;
    }

    const orphanCount = await this.countOrphanRoleReferences();
    if (orphanCount > 0) {
      throw new Error(
        `Cannot add users.role_id foreign key: ${orphanCount} orphaned reference(s) remain`,
      );
    }

    const roleCount = await this.rbacService.findAllRoles();
    if (roleCount.length === 0) {
      throw new Error('Cannot add users.role_id foreign key: roles table is empty');
    }

    await this.dataSource.query(`
      ALTER TABLE users
      ADD CONSTRAINT ${USER_ROLE_FK_NAME}
      FOREIGN KEY (role_id) REFERENCES roles(id)
      ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    this.logger.log(`Added foreign key ${USER_ROLE_FK_NAME} on users.role_id`);
  }

  async countOrphanRoleReferences(): Promise<number> {
    const result: Array<{ count: string | number }> = await this.dataSource.query(`
      SELECT COUNT(*) AS count
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE r.id IS NULL
    `);

    return Number(result[0]?.count ?? 0);
  }

  private async userRoleForeignKeyExists(): Promise<boolean> {
    const rows: Array<Record<string, string>> = await this.dataSource.query(
      'SHOW CREATE TABLE users',
    );
    const createTable = rows[0]?.['Create Table'] ?? '';
    return createTable.includes(USER_ROLE_FK_NAME);
  }
}
