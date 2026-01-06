/**
 * User Types - Shared user-related types
 */

import type { TimestampedEntity, UserRole } from './common';

/**
 * User base interface
 */
export interface User extends TimestampedEntity {
  email: string;
  fullName: string;
  phone?: string | null;
  role: UserRole;
  isActive: boolean;
  isGoogleConnected?: boolean;
  googleEmail?: string | null;
}

/**
 * User for API responses (sometimes uses different naming or omits sensitive fields)
 */
export interface UserApiResponse extends Omit<User, 'isActive'> {
  isActive: boolean;
}

/**
 * User with team context
 */
export interface UserWithTeam extends User {
  teamId?: string;
}

/**
 * Simplified advisor/user representation
 */
export interface AdvisorMinimal {
  id: string;
  email: string;
  fullName: string | null;
}

/**
 * Auth response structure
 */
export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: User;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration data
 */
export interface RegisterData extends LoginCredentials {
  fullName: string;
  role?: Extract<UserRole, 'advisor' | 'manager' | 'owner' | 'staff'>;
}
