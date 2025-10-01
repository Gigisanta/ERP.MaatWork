import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { usePermissions } from '@/utils/permissions';
// Removed LayoutConfig import - using semantic Tailwind classes

const DebugAuth: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const permissions = usePermissions(user);
  
  // Debug logs
  console.log('DebugAuth - user:', user);
  console.log('DebugAuth - isAuthenticated:', isAuthenticated);
  console.log('DebugAuth - permissions:', permissions);
  console.log('DebugAuth - canManageTeams:', permissions.canManageTeams);
  console.log('DebugAuth - canInviteUsers:', permissions.canManageInvitations);
  console.log('DebugAuth - canManageTasks:', permissions.canManageTasks);
  console.log('DebugAuth - canViewMetrics:', permissions.canViewMetrics);
  console.log('DebugAuth - canAccessSystemSettings:', permissions.canAccessSystemSettings);

  return (
    <div className="fixed top-4 right-4 bg-white dark:bg-neutral-800 border-2 border-red-500 p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <h3 className="font-bold text-red-600 mb-2">DEBUG - Estado de Autenticación</h3>
      <div className="text-sm space-y-1">
        <p><strong>Autenticado:</strong> {isAuthenticated ? 'Sí' : 'No'}</p>
        <p><strong>Usuario:</strong> {user ? user.name : 'Ninguno'}</p>
        <p><strong>Rol:</strong> {user ? user.role : 'N/A'}</p>
        <p><strong>Aprobado:</strong> {user ? (user.isApproved ? 'Sí' : 'No') : 'N/A'}</p>
        <hr className="my-2" />
        <p><strong>Permisos:</strong></p>
        <ul className="text-xs ml-2">
          <li>• Es Admin: {permissions.isAdmin ? '✅' : '❌'}</li>
          <li>• Gestionar equipos: {permissions.canManageTeams ? '✅' : '❌'}</li>
          <li>• Invitar usuarios: {permissions.canInviteUsers ? '✅' : '❌'}</li>
          <li>• Gestionar invitaciones: {permissions.canManageInvitations ? '✅' : '❌'}</li>
          <li>• Gestionar tareas: {permissions.canManageTasks ? '✅' : '❌'}</li>
          <li>• Ver métricas: {permissions.canViewMetrics ? '✅' : '❌'}</li>
          <li>• Configuraciones: {permissions.canAccessSystemSettings ? '✅' : '❌'}</li>
        </ul>
      </div>
    </div>
  );
};

export default DebugAuth;