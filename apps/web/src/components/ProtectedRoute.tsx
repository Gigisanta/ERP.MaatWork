import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Permission, usePermissions } from '../utils/permissions';
import { AlertTriangle, Lock } from 'lucide-react';
// Removed LayoutConfig import - using semantic Tailwind classes

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
  requiredPermissions?: Permission[];
  requireAll?: boolean; // Si es true, requiere TODOS los permisos. Si es false, requiere AL MENOS UNO
  fallbackPath?: string;
  showAccessDenied?: boolean;
}

const AccessDenied: React.FC<{ message?: string }> = ({ message }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
      <div className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-8 text-center border border-neutral-200 dark:border-neutral-700">
        <div className="flex justify-center mb-4">
          <div className="bg-red-100 dark:bg-red-900/20 p-3 rounded-full">
            <Lock className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Acceso Denegado</h2>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
          {message || 'No tienes permisos suficientes para acceder a esta sección.'}
        </p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
          >
            Volver
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="px-4 py-2 bg-cactus-600 text-white rounded-lg hover:bg-cactus-700 transition-colors"
          >
            Ir al Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

const AccountPending: React.FC = () => {
  const logout = useAuthStore(state => state.logout);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
      <div className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-8 text-center border border-neutral-200 dark:border-neutral-700">
        <div className="flex justify-center mb-4">
          <div className="bg-amber-100 dark:bg-amber-900/20 p-3 rounded-full">
            <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Cuenta Pendiente</h2>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
          Tu cuenta está pendiente de aprobación por un administrador. 
          Serás notificado cuando tu cuenta sea activada.
        </p>
        <button
          onClick={logout}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredPermissions = [],
  requireAll = false,
  fallbackPath = '/login',
  showAccessDenied = true
}) => {
  const { user, isAuthenticated, isLoading, rememberSession } = useAuthStore();
  const location = useLocation();
  const permissions = usePermissions(user);

  // Hidratación: evitar redirecciones antes de que zustand-persist termine
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    // Marcar hidratado inmediatamente si ya terminó
    if ((useAuthStore as any).persist?.hasHydrated?.()) {
      setIsHydrated(true);
    }
    // Suscribirse a finalización de hidratación
    const unsub = (useAuthStore as any).persist?.onFinishHydration?.(() => {
      setIsHydrated(true);
    });
    // Fallback por si falla el evento
    const timer = setTimeout(() => setIsHydrated(true), 2000);
    return () => {
      clearTimeout(timer);
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Mostrar loading mientras se hidrata el estado únicamente si hay sesión a recordar
  if (isLoading || (!isHydrated && rememberSession)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cactus-600"></div>
      </div>
    );
  }

  // Si no está autenticado, redirigir al login
  if (!isAuthenticated || !user) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Si la cuenta no está aprobada, mostrar pantalla de espera
  if (!user.isApproved) {
    return <AccountPending />;
  }

  // Construir lista de permisos requeridos
  const allRequiredPermissions = [
    ...(requiredPermission ? [requiredPermission] : []),
    ...requiredPermissions
  ];

  // Si no hay permisos requeridos, permitir acceso
  if (allRequiredPermissions.length === 0) {
    return <>{children}</>;
  }

  // Verificar permisos
  const hasAccess = requireAll 
    ? permissions.hasAllPermissions(allRequiredPermissions)
    : permissions.hasAnyPermission(allRequiredPermissions);

  if (!hasAccess) {
    if (showAccessDenied) {
      const permissionNames = allRequiredPermissions.map(p => p.replace(/_/g, ' ')).join(', ');
      const message = `Esta sección requiere los siguientes permisos: ${permissionNames}`;
      return <AccessDenied message={message} />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

// Hook para verificar permisos en componentes
// Mantenemos la exportación para compatibilidad, pero delegamos al hook dedicado
export { useRoutePermissions } from '../hooks/useRoutePermissions';

// Componente para mostrar contenido condicionalmente basado en permisos
interface ConditionalRenderProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
  requiredPermissions?: Permission[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
}

export const ConditionalRender: React.FC<ConditionalRenderProps> = ({
  children,
  requiredPermission,
  requiredPermissions = [],
  requireAll = false,
  fallback = null
}) => {
  const { user } = useAuthStore();
  const permissions = usePermissions(user);

  if (!user || !user.isApproved) {
    return <>{fallback}</>;
  }

  const allRequiredPermissions = [
    ...(requiredPermission ? [requiredPermission] : []),
    ...requiredPermissions
  ];

  if (allRequiredPermissions.length === 0) {
    return <>{children}</>;
  }

  const hasAccess = requireAll 
    ? permissions.hasAllPermissions(allRequiredPermissions)
    : permissions.hasAnyPermission(allRequiredPermissions);

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

// Componente para mostrar información de rol
interface RoleBadgeProps {
  role: string;
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ 
  role, 
  size = 'md', 
  showDescription = false 
}) => {
  const getRoleName = (role: string): string => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Manager';
      case 'advisor': return 'Asesor';
      default: return 'Usuario';
    }
  };

  const getRoleColor = (role: string): string => {
    switch (role) {
      case 'admin': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700';
      case 'manager': return 'bg-cactus-100 dark:bg-cactus-900/30 text-cactus-700 dark:text-cactus-400 border-cactus-200 dark:border-cactus-700';
      case 'advisor': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700';
      default: return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700';
    }
  };

  const getRoleDescription = (role: string): string => {
    switch (role) {
      case 'admin': return 'Acceso completo al sistema';
      case 'manager': return 'Gestión de equipos y tareas';
      case 'advisor': return 'Acceso limitado a métricas';
      default: return 'Sin permisos específicos';
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <div className="flex flex-col items-start">
      <span className={`
        inline-flex items-center rounded-full border font-medium
        ${getRoleColor(role)} ${sizeClasses[size]}
      `}>
        {getRoleName(role)}
      </span>
      {showDescription && (
        <span className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
          {getRoleDescription(role)}
        </span>
      )}
    </div>
  );
};

export default ProtectedRoute;