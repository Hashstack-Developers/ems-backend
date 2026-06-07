import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';

@Injectable()
export class UsersSeedService implements OnModuleInit {
  private readonly logger = new Logger(UsersSeedService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const email =
      this.configService.get<string>('ADMIN_EMAIL') ?? 'admin@ems.local';
    const password =
      this.configService.get<string>('ADMIN_PASSWORD') ?? 'Admin@123';

    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      this.logger.log(`Admin user already exists: ${email}`);
      return;
    }

    await this.usersService.createAdmin(email, password, 'System Administrator');
    this.logger.log(`Default admin user created: ${email}`);
  }
}
