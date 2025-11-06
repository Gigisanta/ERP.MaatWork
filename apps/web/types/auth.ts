/**
 * Tipos relacionados con autenticación y usuarios
 */

import type { TimestampedEntity } from './common';

/**
 * Rol de usuario
 * AI_DECISION: Eliminar 'client' de UserRole - solo se usa en autenticación para advisor/manager/admin
 * Justificación: 'client' es un tipo de contacto, no un rol de usuario del sistema
 * Impacto: Tipos más consistentes entre frontend y backend
 */
export type UserRole = 'advisor' | 'manager' | 'admin';

/**
 * Usuario base - extiende TimestampedEntity
 */
export interface User extends TimestampedEntity {
  email: string;
  fullName: string;
  role: UserRole;
  active: boolean;
}

/**
 * Variante de User para respuestas de API
 * Usa isActive en lugar de active
 */
export interface UserApiResponse extends Omit<User, 'role' | 'active' | 'createdAt' | 'updatedAt'> {
  role: UserRole; // advisor, manager, admin
  isActive: boolean; // Usa isActive en lugar de active
}

/**
 * Variante de User para UI (puede incluir campos adicionales)
 */
export interface UserWithTeam extends User {
  teamId?: string;
}

/**
 * Advisor simplificado (sin timestamps) - usando Pick
 */
export interface Advisor extends Pick<User, 'id' | 'email' | 'fullName'> {}

/**
 * Respuesta de autenticación
 */
export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: User;
}

/**
 * Credenciales de login
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Datos de registro - extiende LoginCredentials
 */
export interface RegisterData extends LoginCredentials {
  fullName: string;
  role?: UserRole;
}
