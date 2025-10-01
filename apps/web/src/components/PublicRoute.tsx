import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, isLoading, isAuthenticated, rememberSession } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  // Debug: Log del estado actual con timestamp para detectar bucles
  console.log(`🛣️ PUBLIC_ROUTE [${new Date().toISOString()}]: Estado actual:`, {
    isAuthenticated,
    user: user ? { id: user.id, username: user.username } : null,
    isLoading,
    rememberSession,
    isHydrated,
    timestamp: Date.now()
  });

  // Esperar a que el estado se hidrate desde el storage
  useEffect(() => {
    // Si la persistencia ya se hidrató, avanzar
    if ((useAuthStore as any).persist?.hasHydrated?.()) {
      setIsHydrated(true);
      return;
    }
    // Escuchar evento de fin de hidratación
    const unsub = (useAuthStore as any).persist?.onFinishHydration?.(() => {
      setIsHydrated(true);
    });
    // Fallback a 2s por seguridad
    const timer = setTimeout(() => setIsHydrated(true), 2000);
    return () => {
      clearTimeout(timer);
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Debug: Log cuando cambia el estado de autenticación
  useEffect(() => {
    console.log('🔄 PUBLIC_ROUTE: Estado de autenticación cambió:', {
      isAuthenticated,
      user: user ? { id: user.id, username: user.username } : null
    });
  }, [isAuthenticated, user]);

  // Mostrar loading mientras se verifica la autenticación o durante la hidratación
  if (isLoading || (rememberSession && !isHydrated)) {
    console.log('⏳ PUBLIC_ROUTE: Mostrando loading', { isLoading, isHydrated });
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Si el usuario está autenticado, redirigir al dashboard
  if (isAuthenticated && user) {
    console.log('🚀 PUBLIC_ROUTE: Usuario autenticado, redirigiendo a dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // Si no está autenticado o no tiene sesión recordada, permitir acceso a la ruta pública
  console.log('📄 PUBLIC_ROUTE: Mostrando ruta pública');
  return <>{children}</>;
};

export default PublicRoute;