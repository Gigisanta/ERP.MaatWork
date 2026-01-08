'use client';
// AI_DECISION: Optimizar useRequireAuth para evitar loading innecesario en navegación
// Justificación: El middleware ya valida el token, no necesitamos resetear loading en cada navegación
// Impacto: Elimina el spinner de carga al navegar entre páginas autenticadas, mejorando UX
import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './AuthContext';

export function useRequireAuth() {
  const { user, initialized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirectedRef = React.useRef(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Calcular loading basado en el estado de autenticación
  // Solo mostrar loading durante la inicialización inicial o cuando realmente no hay usuario
  const loading = !initialized || (!user && initialized);

  React.useEffect(() => {
    console.log('[useRequireAuth] useEffect ejecutado', {
      initialized,
      user: !!user,
      pathname,
      hasRedirected: hasRedirectedRef.current,
      timestamp: new Date().toISOString(),
    });

    // Limpiar timeout anterior si existe
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Esperar a que la autenticación se inicialice antes de tomar decisiones
    if (!initialized) {
      console.log('[useRequireAuth] Aún no inicializado, esperando...');
      return;
    }

    // Si ya redirigimos, no hacer nada más
    if (hasRedirectedRef.current) {
      console.log('[useRequireAuth] Ya redirigió anteriormente, no hacer nada');
      return;
    }

    // Si hay usuario, no hacer nada (el middleware ya validó el token)
    if (user) {
      // Resetear el flag de redirección cuando hay usuario para permitir futuras navegaciones
      console.log('[useRequireAuth] Usuario encontrado, resetear flag de redirección');
      hasRedirectedRef.current = false;
      return;
    }

    console.log('[useRequireAuth] No hay usuario, iniciando timeout de 500ms...');

    // Si no hay usuario después de inicializar, esperar un poco más
    // para dar tiempo a que el AuthContext termine de verificar la sesión
    // Esto evita redirecciones prematuras cuando el middleware ya permitió el acceso
    timeoutRef.current = setTimeout(() => {
      console.log('[useRequireAuth] Timeout completado, verificando usuario nuevamente', {
        user: !!user,
        hasRedirected: hasRedirectedRef.current,
        pathname,
      });

      // Verificar nuevamente si hay usuario antes de redirigir
      // Si aún no hay usuario después del timeout, entonces realmente no hay sesión
      if (!user && !hasRedirectedRef.current) {
        console.error(
          '[useRequireAuth] REDIRIGIENDO A /LOGIN - No hay usuario después del timeout',
          {
            pathname,
            initialized,
            redirectUrl: `/login?redirect=${encodeURIComponent(pathname)}`,
            timestamp: new Date().toISOString(),
          }
        );
        hasRedirectedRef.current = true;
        const redirectUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
        router.push(redirectUrl);
      } else {
        console.log('[useRequireAuth] Usuario encontrado después del timeout, no redirigir');
      }
    }, 500); // Esperar 500ms para dar tiempo a que termine la verificación

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [initialized, user, router, pathname]);

  // Resetear el flag cuando el pathname cambia (navegación a nueva página)
  // Pero solo si no hay usuario autenticado
  React.useEffect(() => {
    if (!user) {
      hasRedirectedRef.current = false;
    }
  }, [pathname, user]);

  return { user, loading };
}
