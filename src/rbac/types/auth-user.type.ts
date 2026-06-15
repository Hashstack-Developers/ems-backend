export interface AuthenticatedUser {
  id: number;
  email: string;
  fullName: string;
  role: string;
  roleId: number;
  permissions: string[];
  isActive: boolean;
}
