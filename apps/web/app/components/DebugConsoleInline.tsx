'use client';

/**
 * Script inline para debugging que se puede pegar directamente en la consola
 * No requiere que el módulo debug-console esté cargado
 */

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Script helper que se inyecta inmediatamente
  const debugHelperScript = `
(function() {
  'use strict';
  
  // Función para obtener logs desde localStorage
  function getDebugLogs() {
    try {
      const saved = localStorage.getItem('debug-console-logs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error al cargar logs:', e);
      return [];
    }
  }
  
  // Crear helper básico que siempre esté disponible
  const debugHelper = {
    logs: getDebugLogs(),
    getLogs: getDebugLogs,
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
      debugHelper.logs = [];
    },
    showErrors: () => {
      const logs = getDebugLogs();
      const errors = logs.filter(l => l.type === 'error');
      console.table(errors);
      return errors;
    },
    showLatest: (count = 10) => {
      const logs = getDebugLogs();
      const latest = logs.slice(0, count);
      latest.forEach((log) => {
        const color = log.type === 'error' ? '#ef4444' : log.type === 'warn' ? '#f59e0b' : '#3b82f6';
        console.log(\`%c[\${log.type.toUpperCase()}] \${log.message}\`, \`color: \${color}; font-weight: bold;\`);
        if (log.stack) {
          console.log('%cStack:', 'color: #6b7280;', log.stack);
        }
      });
      return latest;
    },
    findInLogs: (searchTerm) => {
      const logs = getDebugLogs();
      const results = logs.filter(l => 
        l.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.stack?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      console.table(results);
      return results;
    }
  };
  
  // Asegurar que siempre esté disponible
  if (!window.debugConsole) {
    Object.defineProperty(window, 'debugConsole', {
      value: debugHelper,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
  
  // También crear alias $debug
  if (!window.$debug) {
    Object.defineProperty(window, '$debug', {
      value: debugHelper,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
  
  // Mostrar mensaje de ayuda
  console.log('%c✅ Debug Helper disponible', 'color: #10b981; font-weight: bold; font-size: 14px;');
  console.log('%cComandos disponibles:', 'color: #6b7280;');
  console.log('  - debugConsole.getLogs() - Todos los logs');
  console.log('  - debugConsole.showErrors() - Solo errores (tabla)');
  console.log('  - debugConsole.showLatest(10) - Últimos N logs');
  console.log('  - debugConsole.findInLogs("texto") - Buscar en logs');
  console.log('  - debugConsole.exportLogs() - Exportar como JSON');
  console.log('  - debugConsole.clearLogs() - Limpiar logs');
  console.log('  - $debug.getLogs() - Atajo alternativo');
  
  return debugHelper;
})();
`;

  // Ejecutar el script inmediatamente
  try {
    // eslint-disable-next-line no-eval
    eval(debugHelperScript);
  } catch (error) {
    console.error('Error al inicializar Debug Helper:', error);
  }
}

