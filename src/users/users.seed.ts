import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RbacService } from '../rbac/rbac.service';
import { SYSTEM_ROLES } from '../rbac/constants/roles.constants';
import { UsersService } from './users.service';

@Injectable()
export class UsersSeedService implements OnModuleInit {
  private readonly logger = new Logger(UsersSeedService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly rbacService: RbacService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedUser({
      email: this.configService.get<string>('ADMIN_EMAIL') ?? 'admin@ems.local',
      password: this.configService.get<string>('ADMIN_PASSWORD'),
      fullName: 'System Administrator',
      roleName: SYSTEM_ROLES.ADMIN,
    });

    await this.seedUser({
      email: this.configService.get<string>('SUPER_EMAIL') ?? 'superadmin@ems.online',
      password: this.configService.get<string>('SUPER_PASSWORD'),
      fullName: 'Super Administrator',
      roleName: SYSTEM_ROLES.SUPER,
    });
  }

  private async seedUser(input: {
    email: string;
    password: string | undefined;
    fullName: string;
    roleName: string;
  }) {
    if (!input.password) {
      this.logger.warn(`Skipping seed for ${input.email}: password not configured`);
      return;
    }

    const role = await this.rbacService.findRoleByName(input.roleName);
    if (!role) {
      this.logger.warn(`Role not found for seed user: ${input.roleName}`);
      return;
    }

    const existing = await this.usersService.findByEmail(input.email);
    if (existing) {
      if (existing.roleId !== role.id) {
        await this.usersService.updateUser(existing.id, { roleId: role.id });
        this.logger.log(`Updated role for existing user: ${input.email} -> ${input.roleName}`);
      } else {
        this.logger.log(`User already exists: ${input.email}`);
      }
      return;
    }

    await this.usersService.createUser({
      email: input.email,
      password: input.password,
      fullName: input.fullName,
      roleId: role.id,
    });
    this.logger.log(`User created: ${input.email} (${input.roleName})`);
  }
}
