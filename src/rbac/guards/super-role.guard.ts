import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SUPER_ROLE_KEY } from '../decorators/require-super-role.decorator';
import { SYSTEM_ROLES } from '../constants/roles.constants';
import { AuthenticatedUser } from '../types/auth-user.type';

@Injectable()
export class SuperRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiresSuper = this.reflector.getAllAndOverride<boolean>(SUPER_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiresSuper) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (user.role !== SYSTEM_ROLES.SUPER) {
      throw new ForbiddenException('Super administrator access required');
    }

    return true;
  }
}
