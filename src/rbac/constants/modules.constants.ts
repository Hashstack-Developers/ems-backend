export const MODULES = {
  dashboard: {
    label: 'Dashboard',
    navKey: 'dashboard',
  },
  employees: {
    label: 'Employees',
    navKey: 'employees',
  },
  payrolls: {
    label: 'Payrolls',
    navKey: 'payrolls',
  },
  salarySlips: {
    label: 'Salary Slips',
    navKey: 'salarySlips',
  },
  taxes: {
    label: 'Taxes',
    navKey: 'taxes',
  },
  gpFund: {
    label: 'GP Fund',
    navKey: 'gpFund',
  },
  allowances: {
    label: 'Allowances',
    navKey: 'allowances',
  },
  pension: {
    label: 'Pension',
    navKey: 'pension',
  },
  reports: {
    label: 'Reports',
    navKey: 'reports',
  },
  settings: {
    label: 'Settings',
    navKey: 'settings',
  },
  users: {
    label: 'Users',
    navKey: 'users',
  },
  roles: {
    label: 'Roles',
    navKey: 'roles',
  },
} as const;

export type ModuleKey = keyof typeof MODULES;

export const MODULE_NAV_PERMISSION: Record<ModuleKey, string> = {
  dashboard: 'dashboard.view',
  employees: 'employees.view',
  payrolls: 'payrolls.view',
  salarySlips: 'salarySlips.view',
  taxes: 'taxes.view',
  gpFund: 'gpFund.view',
  allowances: 'allowances.view',
  pension: 'pension.view',
  reports: 'reports.view',
  settings: 'settings.view',
  users: 'users.view',
  roles: 'roles.view',
};
