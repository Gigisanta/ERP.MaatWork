/**
 * useUrlSync Hook
 * 
 * AI_DECISION: Sincronización unidireccional URL → Estado simple sin refs ni flags
 * Justificación: Elimina loops infinitos y hace el flujo de datos predecible
 * Impacto: Código más simple, sin bugs de sincronización
 */

import { useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export interface UseUrlSyncOptions {
  onFileIdChange?: (fileId: string | null) => void;
}

/**
 * Hook to sync URL query params with component state
 * 
 * Uses unidirectional data flow:
 * - URL → State: Automatic on mount and URL changes
 * - State → URL: Manual via updateUrl function
 */
export function useUrlSync(options: UseUrlSyncOptions = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { onFileIdChange } = options;

  // Read fileId from URL
  const fileIdFromUrl = searchParams.get('fileId');

  // Sync URL → State on mount and URL changes
  useEffect(() => {
    if (onFileIdChange) {
      onFileIdChange(fileIdFromUrl);
    }
  }, [fileIdFromUrl, onFileIdChange]);

  // Update URL (State → URL)
  const updateUrl = useCallback((params: { fileId?: string | null }) => {
    const currentParams = new URLSearchParams(searchParams.toString());

    // Update or remove fileId
    if (params.fileId) {
      currentParams.set('fileId', params.fileId);
    } else if (params.fileId === null) {
      currentParams.delete('fileId');
    }

    // Navigate to new URL
    const newUrl = currentParams.toString()
      ? `?${currentParams.toString()}`
      : window.location.pathname;

    router.push(newUrl);
  }, [router, searchParams]);

  // Clear all URL params
  const clearUrl = useCallback(() => {
    router.push(window.location.pathname);
  }, [router]);

  return {
    fileIdFromUrl,
    updateUrl,
    clearUrl
  };
}

