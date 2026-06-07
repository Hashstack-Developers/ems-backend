import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(req: {
        user: {
            id: number;
            email: string;
            role: string;
            fullName: string;
        };
    }, _dto: LoginDto): Promise<{
        success: boolean;
        data: {
            accessToken: string;
            user: {
                id: number;
                email: string;
                fullName: string;
                role: string;
            };
        };
    }>;
    getProfile(req: {
        user: Record<string, unknown>;
    }): {
        success: boolean;
        data: Record<string, unknown>;
    };
    changePassword(req: {
        user: {
            id: number;
        };
    }, dto: ChangePasswordDto): Promise<{
        success: boolean;
        message: string;
    }>;
}
