import { ALL_PERMISSION_KEYS, PERMISSION_DEFINITIONS } from './permissions.constants';

export const SYSTEM_ROLES = {
  SUPER: 'super',
  ADMIN: 'admin',
  VIEWER: 'viewer',
} as const;

export type SystemRoleName = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

export const SYSTEM_ROLE_DEFINITIONS: ReadonlyArray<{
  name: SystemRoleName;
  label: string;
  description: string;
  isSystem: boolean;
}> = [
  {
    name: SYSTEM_ROLES.SUPER,
    label: 'Super Administrator',
    description: 'Full system access including user and role management',
    isSystem: true,
  },
  {
    name: SYSTEM_ROLES.ADMIN,
    label: 'Administrator',
    description: 'Business module access with configurable CRUD permissions',
    isSystem: true,
  },
  {
    name: SYSTEM_ROLES.VIEWER,
    label: 'Viewer',
    description: 'Read-only access to approved modules',
    isSystem: true,
  },
];

const VIEWER_PERMISSIONS = PERMISSION_DEFINITIONS.filter(
  (p) => p.action === 'view' || (p.module === 'reports' && p.action === 'export'),
).map((p) => p.key);

const ADMIN_PERMISSIONS = [
  'dashboard.view',
  'employees.view',
  'employees.create',
  'employees.update',
  'employees.delete',
  'payrolls.view',
  'payrolls.generate',
  'payrolls.delete',
  'salarySlips.view',
  'salarySlips.generate',
  'salarySlips.export',
  'taxes.view',
  'taxes.create',
  'taxes.update',
  'taxes.delete',
  'gpFund.view',
  'gpFund.create',
  'gpFund.update',
  'gpFund.delete',
  'gpFund.generate',
  'gpFund.export',
  'allowances.view',
  'allowances.update',
  'pension.view',
  'pension.update',
  'pension.manage',
  'reports.view',
  'reports.export',
  'settings.view',
];

export const DEFAULT_ROLE_PERMISSIONS: Record<SystemRoleName, readonly string[]> = {
  [SYSTEM_ROLES.SUPER]: ALL_PERMISSION_KEYS,
  [SYSTEM_ROLES.ADMIN]: ADMIN_PERMISSIONS,
  [SYSTEM_ROLES.VIEWER]: VIEWER_PERMISSIONS,
};
