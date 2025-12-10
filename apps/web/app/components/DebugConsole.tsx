'use client';

import { useEffect } from 'react';

/**
 * Componente para inicializar Debug Console solo en desarrollo
 * Captura todos los errores de consola y los muestra en un panel flotante
 */
export default function DebugConsole() {
  useEffect(() => {
    // Solo en desarrollo y en el cliente
    if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') {
      return;
    }

    // Guard: verificar si ya existe una instancia antes de inicializar
    if (
      window.debugConsole &&
      typeof (window.debugConsole as { getLogs?: () => unknown[] }).getLogs === 'function'
    ) {
      return; // Ya está inicializado, no hacer nada
    }

    // Intentar inicializar inmediatamente
    const initializeDebug = async () => {
      // Verificar nuevamente antes de inicializar (race condition guard)
      if (
        window.debugConsole &&
        typeof (window.debugConsole as { getLogs?: () => unknown[] }).getLogs === 'function'
      ) {
        return; // Ya fue inicializado por otro proceso
      }

      try {
        const { initDebugConsole } = await import('../../lib/debug-console');
        initDebugConsole();
      } catch (err) {
        console.error('❌ Error al cargar Debug Console:', err);

        // Crear fallback mínimo solo si no existe
        if (!window.debugConsole) {
          const fallback = {
            getLogs: () => {
              try {
                return JSON.parse(localStorage.getItem('debug-console-logs') || '[]');
              } catch {
                return [];
              }
            },
            exportLogs: () => localStorage.getItem('debug-console-logs') || '[]',
            clearLogs: () => localStorage.removeItem('debug-console-logs'),
          };

          Object.defineProperty(window, 'debugConsole', {
            value: fallback,
            writable: true,
            configurable: true,
            enumerable: true,
          });

          (window as unknown as { $debug: typeof fallback }).$debug = fallback;
        }
      }
    };

    // Dar un pequeño delay para asegurar que el DOM esté listo
    setTimeout(() => {
      initializeDebug();
    }, 500);
  }, []);

  return null; // Componente sin UI
}
