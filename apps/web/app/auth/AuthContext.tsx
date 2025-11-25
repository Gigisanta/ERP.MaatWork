"use client";
// AI_DECISION: Migración a cookies httpOnly exclusivas
// Justificación: Más seguro (inmune a XSS), simplifica código (sin dual storage)
// Impacto: Breaking change - requiere re-login de usuarios activos
import React from 'react';
import { logger } from '../../lib/logger';
import { fetchWithLogging, postJson, fetchJson } from '../../lib/fetch-client';
import { config } from '../../lib/config';
import type { UserRole } from '@/types';

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
  initialized: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [initialized, setInitialized] = React.useState(false);

  React.useEffect(() => {
    logger.info('Verificando sesión con cookie');
    
    // Verificar sesión directamente con /auth/me usando cookies
    fetchWithLogging(`${config.apiUrl}/v1/auth/me`, {
      credentials: 'include'
    })
      .then(async (r) => {
        logger.debug('Respuesta de /auth/me recibida', { status: r.status });
        if (r.ok) {
          const data = await r.json();
          if (data?.user) {
            logger.info('Usuario autenticado', { userId: data.user.id });
            setUser(data.user);
            logger.updateUser(data.user.id, data.user.role);
          }
        }
        setInitialized(true);
      })
      .catch((err) => {
        logger.warn('No hay sesión activa', { error: err });
        setInitialized(true);
      });
  }, []);

  const login = React.useCallback(async (identifier: string, password: string, rememberMe?: boolean) => {
    try {
      logger.info('Iniciando login');
      
      const data = await postJson<{ success: boolean; user: AuthUser }>(`${config.apiUrl}/v1/auth/login`, { 
        identifier, 
        password, 
        rememberMe 
      });
      
      if (data?.user) {
        setUser(data.user);
        logger.updateUser(data.user.id, data.user.role);
        logger.info('Login exitoso', { userId: data.user.id });
      }
    } catch (error) {
      logger.error('Error en login', { 
        error: error instanceof Error ? error.message : String(error),
        identifier 
      });
      throw error;
    }
  }, []);

  const register = React.useCallback(async (data: RegisterData) => {
    try {
      logger.info('Iniciando proceso de registro', { 
        email: data.email, 
        role: data.role
      });
      
      await postJson(`${config.apiUrl}/v1/auth/register`, data);
      
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
    logger.info('Cerrando sesión');
    
    // Llamar endpoint de logout para limpiar cookie
    postJson(`${config.apiUrl}/v1/auth/logout`, {})
      .catch(err => logger.warn('Error limpiando cookie', { err }));
    
    setUser(null);
    logger.updateUser(null, null);
  }, []);

  const value = React.useMemo<AuthContextValue>(() => ({ user, initialized, login, register, logout }), [user, initialized, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


