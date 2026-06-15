import { Body, Controller, Get, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { RequireSuperRole } from '../rbac/decorators/require-super-role.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { SuperRoleGuard } from '../rbac/guards/super-role.guard';
import { AuthenticatedUser } from '../rbac/types/auth-user.type';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Request() req: { user: AuthenticatedUser },
    @Body() _dto: LoginDto,
  ) {
    return {
      success: true,
      data: await this.authService.login(req.user),
    };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('settings.view')
  @Get('profile')
  getProfile(@Request() req: { user: AuthenticatedUser }) {
    return {
      success: true,
      data: req.user,
    };
  }

  @UseGuards(JwtAuthGuard, SuperRoleGuard, PermissionsGuard)
  @RequireSuperRole()
  @RequirePermissions('settings.update')
  @Patch('change-password')
  async changePassword(
    @Request() req: { user: { id: number } },
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return {
      success: true,
      message: 'Password updated successfully',
    };
  }
}
