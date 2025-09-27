import { User, useAuthStore } from '../store/authStore';

// Definición de roles del sistema
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  ADVISOR = 'advisor'
}

// Definición de permisos específicos
export enum Permission {
  // Gestión de usuarios
  VIEW_ALL_USERS = 'view_all_users',
  APPROVE_USERS = 'approve_users',
  DELETE_USERS = 'delete_users',
  MANAGE_USER_ROLES = 'manage_user_roles',
  
  // Gestión de equipos
  CREATE_TEAMS = 'create_teams',
  EDIT_TEAMS = 'edit_teams',
  DELETE_TEAMS = 'delete_teams',
  VIEW_ALL_TEAMS = 'view_all_teams',
  MANAGE_TEAM_MEMBERS = 'manage_team_members',
  
  // Gestión de invitaciones
  SEND_INVITATIONS = 'send_invitations',
  VIEW_ALL_INVITATIONS = 'view_all_invitations',
  CANCEL_INVITATIONS = 'cancel_invitations',
  
  // Gestión de aprobaciones
  CREATE_APPROVALS = 'create_approvals',
  PROCESS_APPROVALS = 'process_approvals',
  VIEW_ALL_APPROVALS = 'view_all_approvals',
  
  // Gestión de tareas
  CREATE_TASKS = 'create_tasks',
  ASSIGN_TASKS = 'assign_tasks',
  VIEW_ALL_TASKS = 'view_all_tasks',
  DELETE_TASKS = 'delete_tasks',
  
  // Métricas y reportes
  VIEW_TEAM_METRICS = 'view_team_metrics',
  VIEW_GLOBAL_METRICS = 'view_global_metrics',
  EXPORT_REPORTS = 'export_reports',
  
  // Configuración del sistema
  MANAGE_SYSTEM_SETTINGS = 'manage_system_settings',
  RESET_SYSTEM = 'reset_system',
  CLEAR_DATABASE = 'clear_database'
}

// Mapeo de roles a permisos
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // Administradores tienen todos los permisos
    Permission.VIEW_ALL_USERS,
    Permission.APPROVE_USERS,
    Permission.DELETE_USERS,
    Permission.MANAGE_USER_ROLES,
    Permission.CREATE_TEAMS,
    Permission.EDIT_TEAMS,
    Permission.DELETE_TEAMS,
    Permission.VIEW_ALL_TEAMS,
    Permission.MANAGE_TEAM_MEMBERS,
    Permission.SEND_INVITATIONS,
    Permission.VIEW_ALL_INVITATIONS,
    Permission.CANCEL_INVITATIONS,
    Permission.CREATE_APPROVALS,
    Permission.PROCESS_APPROVALS,
    Permission.VIEW_ALL_APPROVALS,
    Permission.CREATE_TASKS,
    Permission.ASSIGN_TASKS,
    Permission.VIEW_ALL_TASKS,
    Permission.DELETE_TASKS,
    Permission.VIEW_TEAM_METRICS,
    Permission.VIEW_GLOBAL_METRICS,
    Permission.EXPORT_REPORTS,
    Permission.MANAGE_SYSTEM_SETTINGS,
    Permission.RESET_SYSTEM,
    Permission.CLEAR_DATABASE
  ],
  
  [UserRole.MANAGER]: [
    // Managers pueden gestionar sus equipos y usuarios
    Permission.VIEW_ALL_USERS,
    Permission.CREATE_TEAMS,
    Permission.EDIT_TEAMS,
    Permission.VIEW_ALL_TEAMS,
    Permission.MANAGE_TEAM_MEMBERS,
    Permission.SEND_INVITATIONS,
    Permission.VIEW_ALL_INVITATIONS,
    Permission.CANCEL_INVITATIONS,
    Permission.CREATE_APPROVALS,
    Permission.VIEW_ALL_APPROVALS,
    Permission.CREATE_TASKS,
    Permission.ASSIGN_TASKS,
    Permission.VIEW_ALL_TASKS,
    Permission.VIEW_TEAM_METRICS,
    Permission.EXPORT_REPORTS
  ],
  
  [UserRole.ADVISOR]: [
    // Asesores tienen permisos limitados
    Permission.VIEW_TEAM_METRICS
  ]
};

// Clase para gestión de permisos
export class PermissionManager {
  private user: User | null;
  
  constructor(user: User | null) {
    this.user = user;
  }
  
  /**
   * Verifica si el usuario tiene un permiso específico
   */
  hasPermission(permission: Permission): boolean {
    if (!this.user || !this.user.isApproved) {
      return false;
    }
    
    const userRole = this.user.role as UserRole;
    const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
    
    return rolePermissions.includes(permission);
  }
  
  /**
   * Verifica si el usuario tiene alguno de los permisos especificados
   */
  hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }
  
  /**
   * Verifica si el usuario tiene todos los permisos especificados
   */
  hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(permission));
  }
  
  /**
   * Obtiene todos los permisos del usuario actual
   */
  getUserPermissions(): Permission[] {
    if (!this.user || !this.user.isApproved) {
      return [];
    }
    
    const userRole = this.user.role as UserRole;
    return ROLE_PERMISSIONS[userRole] || [];
  }
  
  /**
   * Verifica si el usuario es administrador
   */
  isAdmin(): boolean {
    return this.user?.role === UserRole.ADMIN && this.user.isApproved;
  }
  
  /**
   * Verifica si el usuario es manager
   */
  isManager(): boolean {
    return this.user?.role === UserRole.MANAGER && this.user.isApproved;
  }
  
  /**
   * Verifica si el usuario es asesor
   */
  isAdvisor(): boolean {
    return this.user?.role === UserRole.ADVISOR && this.user.isApproved;
  }
  
  /**
   * Verifica si el usuario puede gestionar equipos
   */
  canManageTeams(): boolean {
    return this.hasAnyPermission([
      Permission.CREATE_TEAMS,
      Permission.EDIT_TEAMS,
      Permission.DELETE_TEAMS,
      Permission.MANAGE_TEAM_MEMBERS
    ]);
  }
  
  /**
   * Verifica si el usuario puede gestionar usuarios
   */
  canManageUsers(): boolean {
    return this.hasAnyPermission([
      Permission.APPROVE_USERS,
      Permission.DELETE_USERS,
      Permission.MANAGE_USER_ROLES
    ]);
  }
  
  /**
   * Verifica si el usuario puede gestionar invitaciones
   */
  canManageInvitations(): boolean {
    return this.hasAnyPermission([
      Permission.SEND_INVITATIONS,
      Permission.VIEW_ALL_INVITATIONS,
      Permission.CANCEL_INVITATIONS
    ]);
  }
  
  /**
   * Verifica si el usuario puede gestionar aprobaciones
   */
  canManageApprovals(): boolean {
    return this.hasAnyPermission([
      Permission.CREATE_APPROVALS,
      Permission.PROCESS_APPROVALS,
      Permission.VIEW_ALL_APPROVALS
    ]);
  }
  
  /**
   * Verifica si el usuario puede gestionar tareas
   */
  canManageTasks(): boolean {
    return this.hasAnyPermission([
      Permission.CREATE_TASKS,
      Permission.ASSIGN_TASKS,
      Permission.VIEW_ALL_TASKS,
      Permission.DELETE_TASKS
    ]);
  }
  
  /**
   * Verifica si el usuario puede ver métricas
   */
  canViewMetrics(): boolean {
    return this.hasAnyPermission([
      Permission.VIEW_TEAM_METRICS,
      Permission.VIEW_GLOBAL_METRICS
    ]);
  }
  
  /**
   * Verifica si el usuario puede acceder a configuraciones del sistema
   */
  canAccessSystemSettings(): boolean {
    return this.hasPermission(Permission.MANAGE_SYSTEM_SETTINGS);
  }
}

// Hook personalizado para usar permisos en componentes React
export const usePermissions = (user?: User | null) => {
  // Si no se pasa usuario, obtenerlo del store
  const storeUser = useAuthStore(state => state.user);
  const currentUser = user !== undefined ? user : storeUser;
  
  const permissionManager = new PermissionManager(currentUser);
  
  return {
    // Métodos de verificación de permisos
    hasPermission: (permission: Permission) => permissionManager.hasPermission(permission),
    hasAnyPermission: (permissions: Permission[]) => permissionManager.hasAnyPermission(permissions),
    hasAllPermissions: (permissions: Permission[]) => permissionManager.hasAllPermissions(permissions),
    
    // Verificaciones de rol
    isAdmin: permissionManager.isAdmin(),
    isManager: permissionManager.isManager(),
    isAdvisor: permissionManager.isAdvisor(),
    
    // Verificaciones de capacidades específicas
    canManageTeams: permissionManager.canManageTeams(),
    canManageTeam: permissionManager.canManageTeams(), // Alias for compatibility
    canManageUsers: permissionManager.canManageUsers(),
    canEditUsers: permissionManager.canManageUsers(), // Alias for compatibility
    canManageInvitations: permissionManager.canManageInvitations(),
    canManageApprovals: permissionManager.canManageApprovals(),
    canManageTasks: permissionManager.canManageTasks(),
    canViewMetrics: permissionManager.canViewMetrics(),
    canAccessSystemSettings: permissionManager.canAccessSystemSettings(),
    
    // Permisos específicos más granulares
    canViewAllUsers: permissionManager.hasPermission(Permission.VIEW_ALL_USERS),
    canApproveUsers: permissionManager.hasPermission(Permission.APPROVE_USERS),
    canDeleteUsers: permissionManager.hasPermission(Permission.DELETE_USERS),
    canCreateTeams: permissionManager.hasPermission(Permission.CREATE_TEAMS),
    canEditTeams: permissionManager.hasPermission(Permission.EDIT_TEAMS),
    canDeleteTeams: permissionManager.hasPermission(Permission.DELETE_TEAMS),
    canSendInvitations: permissionManager.hasPermission(Permission.SEND_INVITATIONS),
    canProcessApprovals: permissionManager.hasPermission(Permission.PROCESS_APPROVALS),
    canCreateTasks: permissionManager.hasPermission(Permission.CREATE_TASKS),
    canAssignTasks: permissionManager.hasPermission(Permission.ASSIGN_TASKS),
    canViewGlobalMetrics: permissionManager.hasPermission(Permission.VIEW_GLOBAL_METRICS),
    canExportReports: permissionManager.hasPermission(Permission.EXPORT_REPORTS),
    canResetSystem: permissionManager.hasPermission(Permission.RESET_SYSTEM),
    canInviteUsers: permissionManager.hasPermission(Permission.SEND_INVITATIONS),
    
    // Obtener todos los permisos del usuario
    userPermissions: permissionManager.getUserPermissions()
  };
};

// Función utilitaria para verificar permisos sin hook
export const checkPermission = (user: User | null, permission: Permission): boolean => {
  const permissionManager = new PermissionManager(user);
  return permissionManager.hasPermission(permission);
};

// Función para obtener el nombre legible del rol
export const getRoleName = (role: string): string => {
  switch (role) {
    case UserRole.ADMIN:
      return 'Administrador';
    case UserRole.MANAGER:
      return 'Manager';
    case UserRole.ADVISOR:
      return 'Asesor';
    default:
      return 'Usuario';
  }
};

// Función para obtener el color del rol (para UI)
export const getRoleColor = (role: string): string => {
  switch (role) {
    case UserRole.ADMIN:
      return 'bg-error-100 text-error-800';
    case UserRole.MANAGER:
      return 'bg-info-100 text-info-800';
    case UserRole.ADVISOR:
      return 'bg-success-100 text-success-800';
    default:
      return 'bg-neutral-100 text-neutral-800';
  }
};

// Función para obtener la descripción del rol
export const getRoleDescription = (role: string): string => {
  switch (role) {
    case UserRole.ADMIN:
      return 'Acceso completo al sistema, puede gestionar usuarios, equipos y configuraciones';
    case UserRole.MANAGER:
      return 'Puede gestionar equipos, invitaciones, aprobaciones y tareas de su área';
    case UserRole.ADVISOR:
      return 'Acceso limitado, puede ver métricas de su equipo y completar tareas asignadas';
    default:
      return 'Usuario sin permisos específicos';
  }
};