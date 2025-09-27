// Script de debug para verificar el estado de autenticación
const fs = require('fs');
const path = require('path');

// Simular el localStorage del navegador
const mockLocalStorage = {
  'auth-storage': JSON.stringify({
    state: {
      user: {
        id: '1',
        username: 'admin',
        email: 'admin@empresa.com',
        name: 'Administrador',
        role: 'admin',
        isApproved: true
      },
      isAuthenticated: true,
      rememberSession: true
    },
    version: 0
  })
};

console.log('Estado de autenticación simulado:');
console.log(JSON.parse(mockLocalStorage['auth-storage']).state);

// Verificar permisos
const UserRole = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  ADVISOR: 'advisor'
};

const Permission = {
  MANAGE_TEAMS: 'manage_teams',
  VIEW_METRICS: 'view_metrics',
  MANAGE_SYSTEM_SETTINGS: 'manage_system_settings'
};

const ROLE_PERMISSIONS = {
  [UserRole.ADMIN]: [
    Permission.MANAGE_TEAMS,
    Permission.VIEW_METRICS,
    Permission.MANAGE_SYSTEM_SETTINGS
  ],
  [UserRole.MANAGER]: [
    Permission.MANAGE_TEAMS,
    Permission.VIEW_METRICS
  ],
  [UserRole.ADVISOR]: []
};

const user = JSON.parse(mockLocalStorage['auth-storage']).state.user;
console.log('\nPermisos del usuario:');
console.log('- Rol:', user.role);
console.log('- Aprobado:', user.isApproved);
console.log('- Puede gestionar equipos:', ROLE_PERMISSIONS[user.role]?.includes(Permission.MANAGE_TEAMS));
console.log('- Puede ver métricas:', ROLE_PERMISSIONS[user.role]?.includes(Permission.VIEW_METRICS));
console.log('- Puede gestionar configuraciones:', ROLE_PERMISSIONS[user.role]?.includes(Permission.MANAGE_SYSTEM_SETTINGS));