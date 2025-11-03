"use client";
import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './AuthContext';

export function useRequireAuth() {
  const { user, initialized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Esperar a que la autenticación se inicialice antes de tomar decisiones
    if (!initialized) {
      return;
    }

    // Si no hay usuario después de inicializar, redirigir al login
    if (!user) {
      const redirectUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
      router.push(redirectUrl);
    } else {
      setLoading(false);
    }
  }, [initialized, user, router, pathname]);

  return { user, loading };
}
