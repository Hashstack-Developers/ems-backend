import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isValid = await this.usersService.validatePassword(
      password,
      user.password,
    );
    if (!isValid) {
      return null;
    }

    return this.usersService.toPublicUser(user);
  }

  async login(user: {
    id: number;
    email: string;
    role: string;
    fullName: string;
    roleId: number;
    permissions: string[];
    isActive: boolean;
  }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        roleId: user.roleId,
        permissions: user.permissions,
        isActive: user.isActive,
      },
    };
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isValid = await this.usersService.validatePassword(
      currentPassword,
      user.password,
    );
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    await this.usersService.updatePassword(userId, newPassword);
  }
}
