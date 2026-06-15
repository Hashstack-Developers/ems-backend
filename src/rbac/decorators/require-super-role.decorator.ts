import { SetMetadata } from '@nestjs/common';

export const SUPER_ROLE_KEY = 'superRole';

export const RequireSuperRole = () => SetMetadata(SUPER_ROLE_KEY, true);
