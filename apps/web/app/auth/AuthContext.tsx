'use client';
// AI_DECISION: Migración a cookies httpOnly exclusivas
// Justificación: Más seguro (inmune a XSS), simplifica código (sin dual storage)
// Impacto: Breaking change - requiere re-login de usuarios activos
import React from 'react';
import { logger } from '../../lib/logger';
import { postJson } from '../../lib/fetch-client';
import { config } from '../../lib/config';
import {
  verifySession,
  refreshToken,
  clearSession,
  isTokenExpiringSoon,
} from '../../lib/auth/session-manager';
import type { UserRole } from '@/types';
import type { AuthUser, RegisterData } from '@/types/auth';

export type { AuthUser, RegisterData };

interface AuthContextValue {
  user: AuthUser | null;
  initialized: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  mutateUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

// Token refresh interval (5 minutes)
const TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000;
// Token lifetime estimate (24 hours)
const TOKEN_LIFETIME = 24 * 60 * 60 * 1000;

export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
}) {
  const [user, setUser] = React.useState<AuthUser | null>(initialUser ?? null);
  const [initialized, setInitialized] = React.useState(false);
  const hasCheckedSession = React.useRef(false);
  const lastVerifiedRef = React.useRef<number | null>(null);
  const refreshIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Check session with retry logic
  const checkSession = React.useCallback(async (): Promise<void> => {
    const startTime = Date.now();
    logger.debug('Verificando sesión inicial');

    try {
      const result = await verifySession(3, [500, 1000, 2000]);

      if (result.success && result.user) {
        logger.info('Sesión verificada exitosamente', {
          userId: result.user.id,
          duration: Date.now() - startTime,
        });
        setUser(result.user);
        logger.updateUser(result.user.id, result.user.role);
        lastVerifiedRef.current = Date.now();
      } else {
        // Differentiate between error types for better logging
        if (result.error) {
          if (result.error.type === 'auth') {
            logger.debug('No hay sesión activa', {
              status: result.error.status,
              message: result.error.message,
            });
          } else if (result.error.type === 'network') {
            logger.warn('Error de red al verificar sesión', {
              type: result.error.type,
              message: result.error.message,
              status: result.error.status,
            });
          } else {
            logger.warn('Error al verificar sesión', {
              type: result.error.type,
              message: result.error.message,
              status: result.error.status,
            });
          }
        }
        setUser(null);
        logger.updateUser(null, null);
        lastVerifiedRef.current = null;
      }
    } catch (error) {
      // Catch any unexpected errors during session verification
      logger.error('Error inesperado al verificar sesión', {
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
      setUser(null);
      logger.updateUser(null, null);
      lastVerifiedRef.current = null;
    }
  }, []);

  // Initial session check
  React.useEffect(() => {
    // Guard: prevenir múltiples ejecuciones (React StrictMode en desarrollo)
    if (hasCheckedSession.current) {
      return;
    }
    hasCheckedSession.current = true;

    // AI_DECISION: Si hay initialUser, establecerlo inmediatamente y marcar como inicializado
    // Justificación: El layout ya verificó la sesión en el servidor, no necesitamos verificar de nuevo
    // Impacto: Mejor UX evitando verificación duplicada y estado de carga innecesario
    if (initialUser) {
      setUser(initialUser);
      logger.updateUser(initialUser.id, initialUser.role);
      lastVerifiedRef.current = Date.now();
      setInitialized(true);
      return;
    }

    // AI_DECISION: Siempre establecer initialized=true después de verificar sesión
    // Justificación: Incluso si hay errores, necesitamos que el estado initialized se establezca
    //                para que NavigationNew pueda tomar decisiones (redirigir al login)
    // Impacto: Mejor UX evitando estados de carga infinitos cuando hay problemas de red
    checkSession()
      .then(() => {
        setInitialized(true);
      })
      .catch((err) => {
        logger.error('Error crítico al verificar sesión inicial', {
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
        // Asegurar que initialized se establezca incluso con errores
        // Esto permite que NavigationNew redirija al login cuando no hay usuario
        setInitialized(true);
        setUser(null);
        logger.updateUser(null, null);
      });
  }, []); // Solo ejecutar una vez al montar, initialUser se maneja en el estado inicial

  // Automatic token refresh
  React.useEffect(() => {
    if (!user) {
      // Clear refresh interval if no user
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    // Set up automatic refresh
    const scheduleRefresh = () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      refreshIntervalRef.current = setInterval(async () => {
        if (!lastVerifiedRef.current) {
          return;
        }

        // Check if token is expiring soon
        if (isTokenExpiringSoon(lastVerifiedRef.current, 5 * 60 * 1000, TOKEN_LIFETIME)) {
          logger.debug('Token próximo a expirar, refrescando automáticamente');
          const refreshed = await refreshToken();

          if (refreshed) {
            // Verify session after refresh
            const result = await verifySession(1, [500]);
            if (result.success && result.user) {
              setUser(result.user);
              logger.updateUser(result.user.id, result.user.role);
              lastVerifiedRef.current = Date.now();
              logger.info('Token refrescado y sesión verificada automáticamente', {
                userId: result.user.id,
              });
            } else {
              logger.warn('Token refrescado pero verificación de sesión falló');
            }
          } else {
            logger.warn('Fallo al refrescar token automáticamente');
          }
        }
      }, TOKEN_REFRESH_INTERVAL);
    };

    scheduleRefresh();

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [user]);

  // Listen for storage events (multi-tab support)
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // If session changes in another tab, re-check session
      if (e.key === 'maatwork_session_changed' || e.key === null) {
        logger.debug('Cambio de sesión detectado en otra pestaña, re-verificando');
        checkSession().catch((err) => {
          logger.warn('Error al re-verificar sesión después de cambio en otra pestaña', {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkSession]);

  // Listen for auth events from API client
  React.useEffect(() => {
    const handleSessionExpired = (e: CustomEvent) => {
      console.error('[AuthContext] EVENTO auth:session-expired RECIBIDO - LIMPIANDO USUARIO', {
        detail: e.detail,
        previousUser: !!user,
        timestamp: new Date().toISOString(),
      });
      logger.warn('Sesión expirada detectada por API client', {
        detail: e.detail,
      });
      // Clear user state
      setUser(null);
      logger.updateUser(null, null);
      lastVerifiedRef.current = null;
      console.error('[AuthContext] Usuario limpiado debido a sesión expirada');
    };

    const handleTokenRefreshed = () => {
      console.log('[AuthContext] EVENTO auth:token-refreshed RECIBIDO - Re-verificando sesión', {
        timestamp: new Date().toISOString(),
      });
      logger.debug('Token refrescado por API client, re-verificando sesión');
      // Re-verify session after token refresh
      checkSession().catch((err) => {
        logger.warn('Error al re-verificar sesión después de refresh de token', {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    };

    console.log('[AuthContext] Configurando listeners de eventos auth', {
      hasWindow: typeof window !== 'undefined',
      timestamp: new Date().toISOString(),
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:session-expired', handleSessionExpired as EventListener);
      window.addEventListener('auth:token-refreshed', handleTokenRefreshed);
    }

    return () => {
      console.log('[AuthContext] Removiendo listeners de eventos auth');
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:session-expired', handleSessionExpired as EventListener);
        window.removeEventListener('auth:token-refreshed', handleTokenRefreshed);
      }
    };
  }, [checkSession, user]);

  const refreshSession = React.useCallback(async (): Promise<boolean> => {
    logger.debug('Refrescando sesión manualmente');
    const result = await verifySession(2, [500, 1000]);

    if (result.success && result.user) {
      setUser(result.user);
      logger.updateUser(result.user.id, result.user.role);
      lastVerifiedRef.current = Date.now();
      logger.info('Sesión refrescada exitosamente', { userId: result.user.id });
      return true;
    }

    if (result.error?.type === 'auth') {
      // Session expired - clear user
      setUser(null);
      logger.updateUser(null, null);
      lastVerifiedRef.current = null;
    }

    return false;
  }, []);

  const login = React.useCallback(
    async (identifier: string, password: string, rememberMe?: boolean) => {
      const startTime = Date.now();
      try {
        logger.info('Iniciando login', { identifier });

        const data = await postJson<{ success: boolean; user: AuthUser }>(
          `${config.apiUrl}/v1/auth/login`,
          {
            identifier,
            password,
            rememberMe,
          }
        );

        if (!data?.user) {
          throw new Error('Login exitoso pero no se recibió información de usuario');
        }

        // Wait a bit for cookie to be set
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Verify session after login to ensure cookie is set
        logger.debug('Verificando sesión después de login');
        const sessionResult = await verifySession(3, [500, 1000, 2000]);

        if (sessionResult.success && sessionResult.user) {
          setUser(sessionResult.user);
          logger.updateUser(sessionResult.user.id, sessionResult.user.role);
          lastVerifiedRef.current = Date.now();
          logger.info('Login exitoso y sesión verificada', {
            userId: sessionResult.user.id,
            duration: Date.now() - startTime,
          });
        } else {
          // Login succeeded but session verification failed
          logger.warn('Login exitoso pero verificación de sesión falló', {
            error: sessionResult.error,
          });
          // Still set user from login response as fallback
          setUser(data.user);
          logger.updateUser(data.user.id, data.user.role);
          lastVerifiedRef.current = Date.now();
        }
      } catch (error) {
        logger.error('Error en login', {
          error: error instanceof Error ? error.message : String(error),
          identifier,
          duration: Date.now() - startTime,
        });
        throw error;
      }
    },
    []
  );

  const register = React.useCallback(async (data: RegisterData) => {
    try {
      logger.info('Iniciando proceso de registro', {
        email: data.email,
        role: data.role,
      });

      await postJson(`${config.apiUrl}/v1/auth/register`, data);

      logger.info('Registro exitoso', {
        email: data.email,
        role: data.role,
      });
    } catch (error) {
      logger.error('Error en proceso de registro', {
        error: error instanceof Error ? error.message : String(error),
        email: data.email,
        role: data.role,
      });
      throw error;
    }
  }, []);

  const logout = React.useCallback(async () => {
    logger.info('Cerrando sesión');

    // Clear session on server (but don't fail if it errors)
    try {
      await clearSession();
    } catch (error) {
      logger.warn('Error al limpiar sesión en servidor', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Clear local state (always clear, even if server call failed)
    setUser(null);
    logger.updateUser(null, null);
    lastVerifiedRef.current = null;

    // Clear refresh interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    // Notify other tabs
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('maatwork_session_changed', Date.now().toString());
        localStorage.removeItem('maatwork_session_changed');
      } catch {
        // Ignore localStorage errors
      }
    }

    logger.info('Sesión cerrada exitosamente');
  }, []);

  const mutateUser = React.useCallback(async () => {
    logger.debug('[AuthContext] mutateUser called - Refrescando datos de usuario');
    const result = await verifySession(1);
    logger.debug('[AuthContext] mutateUser result', {
      success: result.success,
      hasUser: !!result.user,
      isGoogleConnected: result.user?.isGoogleConnected,
      userId: result.user?.id,
      userEmail: result.user?.email,
    });
    if (result.success && result.user) {
      // AI_DECISION: No incluir user en dependencias para evitar bucles infinitos
      // Justificación: mutateUser es llamado desde componentes que re-renderizan cuando user cambia
      //                Si mutateUser depende de user, crea un bucle: user cambia -> mutateUser cambia -> useEffect dispara -> user cambia
      // Impacto: mutateUser es estable, componentes pueden usarlo sin causar bucles
      setUser(result.user);
    } else {
      logger.warn('[AuthContext] mutateUser failed to get user', {
        success: result.success,
        hasUser: !!result.user,
      });
    }
  }, []); // Sin dependencias - función estable

  const value = React.useMemo<AuthContextValue>(
    () => ({ user, initialized, login, register, logout, refreshSession, mutateUser }),
    [user, initialized, login, register, logout, refreshSession, mutateUser]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
