"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var UsersSeedService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersSeedService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const users_service_1 = require("./users.service");
let UsersSeedService = UsersSeedService_1 = class UsersSeedService {
    usersService;
    configService;
    logger = new common_1.Logger(UsersSeedService_1.name);
    constructor(usersService, configService) {
        this.usersService = usersService;
        this.configService = configService;
    }
    async onModuleInit() {
        const email = this.configService.get('ADMIN_EMAIL') ?? 'admin@ems.local';
        const password = this.configService.get('ADMIN_PASSWORD') ?? 'Admin@123';
        const existing = await this.usersService.findByEmail(email);
        if (existing) {
            this.logger.log(`Admin user already exists: ${email}`);
            return;
        }
        await this.usersService.createAdmin(email, password, 'System Administrator');
        this.logger.log(`Default admin user created: ${email}`);
    }
};
exports.UsersSeedService = UsersSeedService;
exports.UsersSeedService = UsersSeedService = UsersSeedService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        config_1.ConfigService])
], UsersSeedService);
//# sourceMappingURL=users.seed.js.map