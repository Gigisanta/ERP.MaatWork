// AI_DECISION: Helper functions para verificación de permisos basados en roles
// Justificación: Centralizar lógica de verificación de permisos para reutilización y consistencia
// Impacto: Facilita verificación de permisos en componentes frontend

import type { AuthUser } from '../app/auth/AuthContext';

/**
 * Verifica si el usuario es administrador
 */
export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === 'admin';
}

/**
 * Verifica si el usuario puede importar archivos (solo admin)
 */
export function canImportFiles(user: AuthUser | null): boolean {
  return isAdmin(user);
}

/**
 * Verifica si el usuario puede editar recursos compartidos (solo admin)
 * Nota: Para recursos individuales (contactos, portfolios propios), usar las reglas de acceso específicas
 */
export function canEditSharedResources(user: AuthUser | null): boolean {
  return isAdmin(user);
}

/**
 * Verifica si el usuario es manager o admin
 */
export function isManagerOrAdmin(user: AuthUser | null): boolean {
  return user?.role === 'manager' || user?.role === 'admin';
}
