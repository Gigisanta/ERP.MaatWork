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
 * Verifica si el usuario es owner (dueño de agencia)
 */
function isOwner(user: AuthUser | null): boolean {
  return user?.role === 'owner';
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

/**
 * Verifica si el usuario puede modificar datos (todos excepto owner)
 * Owner es rol de solo lectura
 */
function canModifyData(user: AuthUser | null): boolean {
  return user !== null && user.role !== 'owner';
}

/**
 * Verifica si el usuario puede acceder a contactos individuales
 * Owner no tiene acceso a contactos, solo a métricas agregadas
 */
function canAccessContacts(user: AuthUser | null): boolean {
  return user !== null && user.role !== 'owner';
}

/**
 * Verifica si el usuario es staff (administrativo)
 */
function isStaff(user: AuthUser | null): boolean {
  return user?.role === 'staff';
}

/**
 * Verifica si el usuario puede administrar el sistema (solo admin)
 * Staff puede hacer operaciones pero NO administrar usuarios
 */
function canAdminSystem(user: AuthUser | null): boolean {
  return user?.role === 'admin';
}
