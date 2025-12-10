/**
 * Debug Console - Sistema de debugging para desarrollo
 *
 * @module debug-console
 * @description Herramienta de debugging optimizada para capturar y reportar errores de consola
 *
 * Features:
 * - Captura de errores con deduplicación inteligente
 * - Panel flotante con filtros, búsqueda y virtualización
 * - Badge con contador de errores
 * - Exportación y limpieza de logs
 * - Alto rendimiento incluso con 1000+ logs
 *
 * AI_DECISION: Refactorizado desde archivo monolítico (1069 líneas) a módulos especializados
 * Justificación: Mejor mantenibilidad, testabilidad y separación de responsabilidades
 * Impacto: Código más organizado y fácil de extender
 *
 * NOTA: Solo se carga en desarrollo (ver layout.tsx: isDevelopment && <DebugConsole />)
 */

import { DebugConsole } from './debug-console';
export { DebugConsole };
export type { ErrorLog, FilterType, SortOrder } from './types';

// Guard global para prevenir múltiples inicializaciones
let isInitialized = false;

/**
 * Función de inicialización que se puede llamar desde el componente
 */
export function initDebugConsole(): DebugConsole | null {
  if (typeof window === 'undefined') return null;

  // Guard: retornar instancia existente si ya está inicializada
  if (
    isInitialized &&
    window.debugConsole &&
    typeof (window.debugConsole as DebugConsole).getLogs === 'function'
  ) {
    return window.debugConsole as DebugConsole;
  }

  try {
    const debugConsole = new DebugConsole();

    // Exponer globalmente para acceso desde consola del navegador
    Object.defineProperty(window, 'debugConsole', {
      value: debugConsole,
      writable: true,
      configurable: true,
      enumerable: true,
    });

    // También crear alias directo para facilitar acceso
    (window as unknown as { $debug: DebugConsole }).$debug = debugConsole;

    // Marcar como inicializado
    isInitialized = true;

    // Mensaje consolidado y compacto
    console.log(
      '%c🐛 Debug Console activado',
      'color: #ef4444; font-weight: bold; font-size: 14px;'
    );
    console.log(
      '%cUsa window.debugConsole o window.$debug para acceder a los métodos:',
      'color: #6b7280;'
    );
    console.log('  - window.debugConsole.getLogs() - Obtener todos los logs');
    console.log('  - window.debugConsole.exportLogs() - Exportar logs como JSON');
    console.log('  - window.debugConsole.clearLogs() - Limpiar logs');
    console.log('  - window.$debug.getLogs() - Atajo (alternativa)');
    console.log('  - Haz click en el botón 🐛 en la esquina inferior derecha para ver el panel');

    return debugConsole;
  } catch (error) {
    console.error('Error al inicializar Debug Console:', error);

    // Crear un objeto mínimo incluso si hay error
    const fallback = {
      getLogs: () => [],
      exportLogs: () => '[]',
      clearLogs: () => {},
    };

    Object.defineProperty(window, 'debugConsole', {
      value: fallback,
      writable: true,
      configurable: true,
      enumerable: true,
    });

    return null;
  }
}
