import { UserRole } from '@maatwork/types';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName?: string;
  isActive?: boolean;
  isGoogleConnected?: boolean;
  googleEmail?: string | null;
}

export interface RegisterData {
  email: string;
  fullName: string;
  username?: string;
  password: string;
  role: 'advisor' | 'manager' | 'owner' | 'staff';
  requestedManagerId?: string;
}
