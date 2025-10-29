"use client";
// REGLA CURSOR: Context de autenticación - mantener estrategia de token (localStorage + cookie), no alterar flujo de verificación
import React from 'react';
import { logger } from '../../lib/logger';
import { fetchWithLogging, postJson, fetchJson } from '../../lib/fetch-client';

type UserRole = 'advisor' | 'manager' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName?: string;
}

interface RegisterData {
  email: string;
  fullName: string;
  username?: string;
  password: string;
  role: 'advisor' | 'manager';
  requestedManagerId?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  initialized: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

function getApiUrl(): string {
  // En desarrollo, usar localhost:3001 directamente
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }
  
  // En el cliente, usar localhost:3001 para desarrollo
  const url = 'http://localhost:3001';
  logger.debug('API URL configurada', { apiUrl: url });
  return url;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [initialized, setInitialized] = React.useState(false);

  React.useEffect(() => {
    logger.info('Inicializando estado de autenticación');
    const stored = typeof window !== 'undefined' ? localStorage.getItem('cactus_token') : null;
    
    if (stored) {
      logger.info('Token encontrado en localStorage, verificando validez');
      setToken(stored);
      
      // Actualizar datos de usuario en el logger
      try {
        const payload = JSON.parse(atob(stored.split('.')[1]));
        logger.updateUser(payload.id, payload.role);
      } catch (error) {
        logger.warn('Error decodificando token para logger', { error });
      }
      
      // intentar cargar /auth/me
      const apiUrl = getApiUrl();
      logger.debug('Verificando token con endpoint /auth/me', { apiUrl: `${apiUrl}/auth/me` });
      
      fetchWithLogging(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${stored}` },
        credentials: 'include'
      })
        .then(async (r) => {
          logger.debug('Respuesta de /auth/me recibida', { status: r.status });
          return (r.ok ? r.json() : null);
        })
        .then((data) => {
          if (data?.user) {
            logger.info('Usuario autenticado correctamente', { 
              userId: data.user.id, 
              userRole: data.user.role 
            });
            setUser(data.user);
            logger.updateUser(data.user.id, data.user.role);
          } else {
            logger.warn('Token inválido, limpiando estado');
            localStorage.removeItem('cactus_token');
            // También limpiar la cookie
            document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            setToken(null);
            logger.updateUser(null, null);
          }
          setInitialized(true);
        })
        .catch((err) => {
          logger.error('Error verificando token de autenticación', { error: err });
          localStorage.removeItem('cactus_token');
          // También limpiar la cookie
          document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          setToken(null);
          logger.updateUser(null, null);
          setInitialized(true);
        });
    } else {
      logger.debug('No se encontró token en localStorage');
      setInitialized(true);
    }
  }, []);

  const login = React.useCallback(async (identifier: string, password: string, rememberMe?: boolean) => {
    try {
      const apiUrl = getApiUrl();
      logger.info('Iniciando proceso de login', { identifier, rememberMe, apiUrl: `${apiUrl}/auth/login` });
      
      const data = await postJson(`${apiUrl}/auth/login`, { identifier, password, rememberMe });
      
      logger.info('Login exitoso, token recibido');
      const t = data.token as string;
      localStorage.setItem('cactus_token', t);
      // También guardar en cookie para el middleware
      const maxAge = rememberMe ? 2592000 : 86400; // 30 días o 1 día
      const secureAttr = typeof window !== 'undefined' && window.location.protocol === 'https:' ? ' Secure' : '';
      document.cookie = `token=${t}; path=/; max-age=${maxAge}; SameSite=Lax;${secureAttr}`;
      setToken(t);
      
      // Obtener datos del usuario
      const userData = await fetchJson(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      
      if (userData?.user) {
        setUser(userData.user);
        logger.updateUser(userData.user.id, userData.user.role);
        logger.info('Datos de usuario cargados correctamente', { 
          userId: userData.user.id, 
          userRole: userData.user.role 
        });
      }
    } catch (error) {
      logger.error('Error en proceso de login', { 
        error: error instanceof Error ? error.message : String(error),
        identifier 
      });
      throw error;
    }
  }, []);

  const register = React.useCallback(async (data: RegisterData) => {
    try {
      const apiUrl = getApiUrl();
      logger.info('Iniciando proceso de registro', { 
        email: data.email, 
        role: data.role,
        apiUrl: `${apiUrl}/auth/register` 
      });
      
      const responseData = await postJson(`${apiUrl}/auth/register`, data);
      
      logger.info('Registro exitoso', { 
        email: data.email, 
        role: data.role 
      });
      
    } catch (error) {
      logger.error('Error en proceso de registro', { 
        error: error instanceof Error ? error.message : String(error),
        email: data.email,
        role: data.role
      });
      throw error;
    }
  }, []);

  const logout = React.useCallback(() => {
    logger.info('Usuario cerrando sesión', { userId: user?.id, userRole: user?.role });
    localStorage.removeItem('cactus_token');
    // También limpiar la cookie
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    setToken(null);
    setUser(null);
    logger.updateUser(null, null);
  }, [user?.id, user?.role]);

  const value = React.useMemo<AuthContextValue>(() => ({ user, token, initialized, login, register, logout }), [user, token, initialized, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


