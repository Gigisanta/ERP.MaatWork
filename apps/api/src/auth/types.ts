export const ROLES = ['advisor', 'manager', 'admin'] as const;
export type UserRole = (typeof ROLES)[number];

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName?: string;
  isActive?: boolean;
}
