"use client";
import React from 'react';

type UserRole = 'advisor' | 'manager' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, role?: UserRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

function getApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  console.log('API URL:', url);
  return url;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<AuthUser | null>(null);

  React.useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('cactus_token') : null;
    if (stored) {
      setToken(stored);
      // intentar cargar /auth/me
      fetch(`${getApiUrl()}/auth/me`, {
        headers: { Authorization: `Bearer ${stored}` },
        credentials: 'include'
      })
        .then(async (r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.user) setUser(data.user);
        })
        .catch(() => void 0);
    }
  }, []);

  const login = React.useCallback(async (email: string, role?: UserRole) => {
    try {
      const apiUrl = getApiUrl();
      console.log('Attempting login to:', `${apiUrl}/auth/login`);
      console.log('Login payload:', { email, role });
      
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role })
      });
      
      console.log('Login response status:', res.status);
      console.log('Login response ok:', res.ok);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Login error response:', errorText);
        throw new Error('Credenciales inválidas');
      }
      
      const data = await res.json();
      console.log('Login success, token received');
      const t = data.token as string;
      localStorage.setItem('cactus_token', t);
      setToken(t);
      
      const me = await fetch(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (me.ok) {
        const { user } = await me.json();
        setUser(user);
        console.log('User data loaded:', user);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, []);

  const logout = React.useCallback(() => {
    localStorage.removeItem('cactus_token');
    setToken(null);
    setUser(null);
  }, []);

  const value = React.useMemo<AuthContextValue>(() => ({ user, token, login, logout }), [user, token, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


