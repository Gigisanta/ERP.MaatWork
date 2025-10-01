import { useAuthStore } from '../store/authStore';

export interface Permission {
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
  canView: boolean;
  canManageTeam: boolean;
  canManageSettings: boolean;
  canAccessSystemSettings: boolean;
  canDeleteUsers: boolean;
  canResetSystem: boolean;
  canViewAllUsers: boolean;
  canManageUsers: boolean;
}

export const usePermissions = (user?: any): Permission => {
  const authUser = user || useAuthStore().user;
  
  // Por defecto, todos los usuarios autenticados tienen permisos básicos
  const defaultPermissions: Permission = {
    canEdit: true,
    canDelete: true,
    canCreate: true,
    canView: true,
    canManageTeam: false,
    canManageSettings: false,
    canAccessSystemSettings: false,
    canDeleteUsers: false,
    canResetSystem: false,
    canViewAllUsers: true,
    canManageUsers: false
  };

  if (!authUser) {
    return {
      canEdit: false,
      canDelete: false,
      canCreate: false,
      canView: false,
      canManageTeam: false,
      canManageSettings: false,
      canAccessSystemSettings: false,
      canDeleteUsers: false,
      canResetSystem: false,
      canViewAllUsers: false,
      canManageUsers: false
    };
  }

  // Los administradores tienen todos los permisos
  if (authUser.role === 'admin') {
    return {
      canEdit: true,
      canDelete: true,
      canCreate: true,
      canView: true,
      canManageTeam: true,
      canManageSettings: true,
      canAccessSystemSettings: true,
      canDeleteUsers: true,
      canResetSystem: true,
      canViewAllUsers: true,
      canManageUsers: true
    };
  }

  return {
    ...defaultPermissions,
    canAccessSystemSettings: false,
    canDeleteUsers: false,
    canResetSystem: false,
    canViewAllUsers: true,
    canManageUsers: false
  };
};