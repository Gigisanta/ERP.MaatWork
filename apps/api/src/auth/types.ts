// AI_DECISION: Sistema de roles jerárquico
// - admin: OMNIPOTENTE - acceso total a todo el sistema y administración
// - owner: Dirección - solo lectura de métricas de negocio globales
// - staff: Administrativo - soporte operativo (carga de datos, gestión básica)
// - manager: Gerente de equipo - gestión de su equipo y contactos
// - advisor: Asesor - gestión de sus propios contactos
export const ROLES = ['advisor', 'manager', 'admin', 'owner', 'staff'] as const;
export type UserRole = (typeof ROLES)[number];

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName?: string;
  isActive?: boolean;
}
