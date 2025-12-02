'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { logger, toLogContext } from '@/lib/logger';
import type { UserApiResponse as User } from '@/types';
import type { AuthUser } from '@/app/auth/AuthContext';

interface AliasData {
  id: string;
  aliasRaw: string;
  aliasNormalized: string;
  userId: string;
}

// AI_DECISION: Usar AuthUser en props porque viene del contexto de autenticación
// Justificación: El hook recibe user del AuthContext que devuelve AuthUser, no UserApiResponse
// Impacto: Compatibilidad correcta de tipos entre AuthContext y hooks del perfil
interface UseAliasesProps {
  user: AuthUser | null;
  showToast: (
    title: string,
    description?: string,
    variant?: 'success' | 'error' | 'warning' | 'info'
  ) => void;
  setError: (error: string | null) => void;
}

interface UseAliasesReturn {
  aliases: AliasData[];
  newAlias: string;
  setNewAlias: (value: string) => void;
  aliasLoading: boolean;
  addAlias: () => Promise<void>;
  deleteAlias: (id: string) => Promise<void>;
  loadAliases: () => Promise<void>;
  deleteAliasRef: React.RefObject<((id: string) => Promise<void>) | null>;
  aliasLoadingRef: React.RefObject<boolean>;
}

/**
 * Hook para gestionar aliases de AUM del usuario
 */
export function useAliases({ user, showToast, setError }: UseAliasesProps): UseAliasesReturn {
  const [aliases, setAliases] = useState<AliasData[]>([]);
  const [newAlias, setNewAlias] = useState('');
  const [aliasLoading, setAliasLoading] = useState(false);

  // Refs para mantener referencias estables
  const userIdRef = useRef(user?.id);
  const loadAliasesRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const showToastRef = useRef(showToast);
  const deleteAliasRef = useRef<((id: string) => Promise<void>) | null>(null);
  const aliasLoadingRef = useRef(aliasLoading);

  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  useEffect(() => {
    aliasLoadingRef.current = aliasLoading;
  }, [aliasLoading]);

  const loadAliases = useCallback(async () => {
    try {
      const m = await import('@/lib/api/settings');
      const resp = await m.listAdvisorAliases();
      if (resp.success && resp.data) {
        const mine = (resp.data.aliases || []).filter((a) => a.userId === userIdRef.current);
        setAliases(mine);
      }
    } catch (e) {
      logger.warn('No se pudieron obtener aliases', toLogContext({ e }));
    }
  }, []);

  useEffect(() => {
    loadAliasesRef.current = loadAliases;
  }, [loadAliases]);

  useEffect(() => {
    if (user) {
      void loadAliases();
    }
  }, [user, loadAliases]);

  const addAlias = async () => {
    if (!newAlias.trim() || !user) return;
    try {
      setAliasLoading(true);
      const m = await import('@/lib/api/settings');
      await m.createAdvisorAlias({ alias: newAlias, userId: user.id });
      setNewAlias('');
      if (loadAliasesRef.current) {
        await loadAliasesRef.current();
      }
      showToastRef.current('Alias agregado', undefined, 'success');
    } catch (e) {
      const err = e as { userMessage?: string; message?: string };
      const msg = err.userMessage || err.message || 'Error creando alias';
      setError(msg);
      showToastRef.current('Error', msg, 'error');
    } finally {
      setAliasLoading(false);
    }
  };

  const deleteAlias = useCallback(
    async (id: string) => {
      try {
        setAliasLoading(true);
        const m = await import('@/lib/api/settings');
        await m.deleteAdvisorAlias(id);
        if (loadAliasesRef.current) {
          await loadAliasesRef.current();
        }
        showToastRef.current('Alias eliminado', undefined, 'success');
      } catch (e) {
        const err = e as { userMessage?: string; message?: string };
        const msg = err.userMessage || err.message || 'Error eliminando alias';
        setError(msg);
        showToastRef.current('Error', msg, 'error');
      } finally {
        setAliasLoading(false);
      }
    },
    [setError]
  );

  // Actualizar ref inmediatamente después de definir deleteAlias
  deleteAliasRef.current = deleteAlias;

  useEffect(() => {
    deleteAliasRef.current = deleteAlias;
  }, [deleteAlias]);

  return {
    aliases,
    newAlias,
    setNewAlias,
    aliasLoading,
    addAlias,
    deleteAlias,
    loadAliases,
    deleteAliasRef,
    aliasLoadingRef,
  };
}
