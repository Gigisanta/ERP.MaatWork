/**
 * Tipos relacionados con autenticación y usuarios
 */

import type { TimestampedEntity } from './common';

/**
 * Rol de usuario
 * AI_DECISION: Sistema de roles jerárquico
 * - admin: OMNIPOTENTE - acceso total a todo el sistema
 * - owner: Dirección - solo lectura de métricas globales
 * - staff: Administrativo - soporte operativo (carga datos, gestión básica)
 * - manager: Gerente de equipo
 * - advisor: Asesor
 */
export type UserRole = 'advisor' | 'manager' | 'admin' | 'owner' | 'staff';

/**
 * Usuario base - extiende TimestampedEntity
 */
export interface User extends TimestampedEntity {
  email: string;
  fullName: string;
  phone?: string | null;
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
 * AI_DECISION: Roles disponibles en registro público (admin solo por admin)
 */
export interface RegisterData extends LoginCredentials {
  fullName: string;
  role?: 'advisor' | 'manager' | 'owner' | 'staff'; // Roles permitidos en registro
}
