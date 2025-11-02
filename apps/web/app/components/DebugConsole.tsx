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

    // Intentar inicializar inmediatamente
    const initializeDebug = async () => {
      try {
        const { initDebugConsole } = await import('../../lib/debug-console');
        const debug = initDebugConsole();
        
        if (!debug) {
          console.warn('⚠️ Debug Console no se pudo inicializar');
          
          // Crear fallback simple
          const fallback = {
            getLogs: () => {
              try {
                const saved = localStorage.getItem('debug-console-logs');
                return saved ? JSON.parse(saved) : [];
              } catch {
                return [];
              }
            },
            exportLogs: () => {
              try {
                return localStorage.getItem('debug-console-logs') || '[]';
              } catch {
                return '[]';
              }
            },
            clearLogs: () => {
              localStorage.removeItem('debug-console-logs');
              console.log('✅ Logs limpiados');
            },
          };
          
          Object.defineProperty(window, 'debugConsole', {
            value: fallback,
            writable: true,
            configurable: true,
            enumerable: true,
          });
          
          (window as unknown as { $debug: typeof fallback }).$debug = fallback;
          
          console.log('%c✅ Debug Helper (fallback) creado', 'color: #f59e0b; font-weight: bold;');
          console.log('Usa: window.$debug.getLogs()');
        }
      } catch (err) {
        console.error('❌ Error al cargar Debug Console:', err);
        
        // Crear fallback mínimo
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
        
        console.warn('⚠️ Usando Debug Helper básico (fallback)');
      }
    };
    
    // Dar un pequeño delay para asegurar que el DOM esté listo
    setTimeout(() => {
      initializeDebug();
    }, 500);
  }, []);

  return null; // Componente sin UI
}

