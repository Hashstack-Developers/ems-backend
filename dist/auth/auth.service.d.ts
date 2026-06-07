import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    validateUser(email: string, password: string): Promise<{
        id: number;
        email: string;
        fullName: string;
        role: import("../users/entities/user.entity").UserRole;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    login(user: {
        id: number;
        email: string;
        role: string;
        fullName: string;
    }): Promise<{
        accessToken: string;
        user: {
            id: number;
            email: string;
            fullName: string;
            role: string;
        };
    }>;
    changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void>;
}
