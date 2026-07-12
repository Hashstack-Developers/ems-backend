import { MODULES, ModuleKey } from './modules.constants';

export type PermissionAction =
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'export'
  | 'generate'
  | 'deactivate';

export interface PermissionDefinition {
  key: string;
  module: ModuleKey;
  action: PermissionAction;
  description: string;
}

export const PERMISSION_DEFINITIONS: readonly PermissionDefinition[] = [
  { key: 'dashboard.view', module: 'dashboard', action: 'view', description: 'View dashboard statistics' },

  { key: 'employees.view', module: 'employees', action: 'view', description: 'View employees' },
  { key: 'employees.create', module: 'employees', action: 'create', description: 'Create employees' },
  { key: 'employees.update', module: 'employees', action: 'update', description: 'Update employees' },
  { key: 'employees.delete', module: 'employees', action: 'delete', description: 'Delete employees' },

  { key: 'payrolls.view', module: 'payrolls', action: 'view', description: 'View payrolls' },
  { key: 'payrolls.generate', module: 'payrolls', action: 'generate', description: 'Generate payrolls' },
  { key: 'payrolls.delete', module: 'payrolls', action: 'delete', description: 'Delete payrolls' },

  { key: 'salarySlips.view', module: 'salarySlips', action: 'view', description: 'View salary slips' },
  { key: 'salarySlips.generate', module: 'salarySlips', action: 'generate', description: 'Generate salary slips' },
  { key: 'salarySlips.export', module: 'salarySlips', action: 'export', description: 'Export salary slip PDFs' },

  { key: 'taxes.view', module: 'taxes', action: 'view', description: 'View tax slabs and sub-taxes' },
  { key: 'taxes.create', module: 'taxes', action: 'create', description: 'Create tax slabs and sub-taxes' },
  { key: 'taxes.update', module: 'taxes', action: 'update', description: 'Update tax slabs and sub-taxes' },
  { key: 'taxes.delete', module: 'taxes', action: 'delete', description: 'Delete tax slabs and sub-taxes' },

  { key: 'gpFund.view', module: 'gpFund', action: 'view', description: 'View GP fund records' },
  { key: 'gpFund.create', module: 'gpFund', action: 'create', description: 'Create GP fund records' },
  { key: 'gpFund.update', module: 'gpFund', action: 'update', description: 'Update GP fund records' },
  { key: 'gpFund.delete', module: 'gpFund', action: 'delete', description: 'Delete GP fund records' },
  { key: 'gpFund.generate', module: 'gpFund', action: 'generate', description: 'Generate GP fund reports' },
  { key: 'gpFund.export', module: 'gpFund', action: 'export', description: 'Export GP fund report PDFs' },

  { key: 'allowances.view', module: 'allowances', action: 'view', description: 'View allowances overview and settings' },
  { key: 'allowances.update', module: 'allowances', action: 'update', description: 'Update allowance default rates' },

  { key: 'pension.view', module: 'pension', action: 'view', description: 'View pension enrollments and overview' },
  { key: 'pension.update', module: 'pension', action: 'update', description: 'Update pension default rates' },
  { key: 'pension.manage', module: 'pension', action: 'create', description: 'Enroll and manage employee pension contributions' },

  { key: 'reports.view', module: 'reports', action: 'view', description: 'View reports' },
  { key: 'reports.export', module: 'reports', action: 'export', description: 'Export reports' },

  { key: 'settings.view', module: 'settings', action: 'view', description: 'View account settings' },
  { key: 'settings.update', module: 'settings', action: 'update', description: 'Change passwords (super administrator only)' },

  { key: 'users.view', module: 'users', action: 'view', description: 'View system users' },
  { key: 'users.create', module: 'users', action: 'create', description: 'Create system users' },
  { key: 'users.update', module: 'users', action: 'update', description: 'Update system users' },
  { key: 'users.deactivate', module: 'users', action: 'deactivate', description: 'Deactivate or reactivate system users' },
  { key: 'users.delete', module: 'users', action: 'delete', description: 'Delete system users' },

  { key: 'roles.view', module: 'roles', action: 'view', description: 'View roles and permissions' },
  { key: 'roles.update', module: 'roles', action: 'update', description: 'Update role permissions' },
] as const;

export const ALL_PERMISSION_KEYS = PERMISSION_DEFINITIONS.map((p) => p.key);

export const PERMISSION_KEYS = Object.fromEntries(
  PERMISSION_DEFINITIONS.map((p) => [p.key.replace('.', '_').toUpperCase(), p.key]),
) as Record<string, string>;

export function getModuleLabel(module: ModuleKey): string {
  return MODULES[module].label;
}
