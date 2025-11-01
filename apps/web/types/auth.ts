/**
 * Tipos relacionados con autenticación y usuarios
 */

export type UserRole = 'client' | 'advisor' | 'manager' | 'admin';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  fullName: string;
  role?: UserRole;
}

