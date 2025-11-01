/**
 * Tipos relacionados con autenticación y usuarios
 */

export type UserRole = 'client' | 'advisor' | 'manager' | 'admin';

/**
 * Tipo base de Usuario - versión completa con timestamps
 */
export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Variante de User para respuestas de API (puede no incluir todos los campos)
 */
export interface UserApiResponse {
  id: string;
  email: string;
  fullName: string;
  role: Exclude<UserRole, 'client'>; // API no devuelve client
  isActive: boolean; // Usa isActive en lugar de active
}

/**
 * Variante de User para UI (puede incluir campos adicionales)
 */
export interface UserWithTeam extends User {
  teamId?: string;
}

/**
 * Advisor simplificado (sin timestamps)
 */
export interface Advisor {
  id: string;
  email: string;
  fullName: string;
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

