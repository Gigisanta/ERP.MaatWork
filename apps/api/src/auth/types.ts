import type { UserRole } from '@maatwork/types';

export type { UserRole };
export const ROLES = ['advisor', 'manager', 'admin', 'owner', 'staff'] as const;

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName?: string;
  isActive?: boolean;
}
