/**
 * useAumFileUpload Hook
 * 
 * AI_DECISION: Hook especializado para upload con exponential backoff y cleanup automático
 * Justificación: Encapsula lógica compleja de retry y manejo de estado de upload
 * Impacto: Código más limpio, reutilizable y sin memory leaks
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AUM_ROWS_CONFIG } from '../lib/aumRowsConstants';

export interface UseAumFileUploadOptions {
  onSuccess?: (fileId: string) => void;
  onError?: (error: Error) => void;
  maxRetries?: number;
  baseDelay?: number;
}

/**
 * Hook for AUM file upload with retry logic and exponential backoff
 */
export function useAumFileUpload(options: UseAumFileUploadOptions = {}) {
  const {
    onSuccess,
    onError,
    maxRetries = AUM_ROWS_CONFIG.RETRY_MAX,
    baseDelay = AUM_ROWS_CONFIG.RETRY_BASE_DELAY
  } = options;

  const [isWaitingForProcessing, setIsWaitingForProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  /**
   * Start retry process with exponential backoff
   */
  const startRetry = useCallback((fileId: string, revalidate: () => void) => {
    const attemptRevalidation = () => {
      // AI_DECISION: Log de retry para debugging (puede removerse en producción)
      // Justificación: Útil para debugging de uploads fallidos
      // Impacto: Mejor debugging sin afectar producción
      
      // Attempt revalidation
      revalidate();

      // Check if we should retry again
      retryCountRef.current += 1;

      if (retryCountRef.current < maxRetries) {
        // Calculate next delay with exponential backoff
        const delay = baseDelay * Math.pow(2, retryCountRef.current);
        // Log de delay para debugging

        retryTimeoutRef.current = setTimeout(attemptRevalidation, delay);
      } else {
        // Max retries reached
        // Max retries alcanzado
        setIsWaitingForProcessing(false);
        const error = new Error('Upload processing timed out. Please refresh the page.');
        setUploadError(error.message);
        onError?.(error);
      }
    };

    // Start first retry with base delay
    // Iniciando proceso de retry
    retryTimeoutRef.current = setTimeout(attemptRevalidation, baseDelay);
  }, [maxRetries, baseDelay, onError]);

  /**
   * Handle successful upload
   */
  const handleUploadSuccess = useCallback((fileId: string, revalidate: () => void) => {
    // Upload exitoso, esperando procesamiento
    setIsWaitingForProcessing(true);
    setUploadError(null);
    retryCountRef.current = 0;

    // Clear any existing timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Start retry process
    startRetry(fileId, revalidate);

    // Call success callback
    onSuccess?.(fileId);
  }, [startRetry, onSuccess]);

  /**
   * Handle upload error
   */
  const handleUploadError = useCallback((error: Error) => {
    // AI_DECISION: Error logging en hook (puede mejorarse con logger estructurado)
    // Justificación: Error crítico necesita logging para debugging
    // Impacto: Mejor debugging de errores de upload
    setIsWaitingForProcessing(false);
    setUploadError(error.message);
    onError?.(error);

    // Clear retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, [onError]);

  /**
   * Stop waiting and clear timeouts
   */
  const stopWaiting = useCallback(() => {
    setIsWaitingForProcessing(false);
    retryCountRef.current = 0;

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  /**
   * Reset upload state
   */
  const resetUpload = useCallback(() => {
    stopWaiting();
    setUploadError(null);
  }, [stopWaiting]);

  return {
    isWaitingForProcessing,
    uploadError,
    handleUploadSuccess,
    handleUploadError,
    stopWaiting,
    resetUpload
  };
}

