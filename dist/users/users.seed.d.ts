import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
export declare class UsersSeedService implements OnModuleInit {
    private readonly usersService;
    private readonly configService;
    private readonly logger;
    constructor(usersService: UsersService, configService: ConfigService);
    onModuleInit(): Promise<void>;
}
