/**
 * Helpers para usar desde la consola del navegador
 * 
 * Pega este código directamente en la consola del navegador:
 */

// Script para verificar y crear debugConsole si no existe
const debugHelperScript = `
(function() {
  'use strict';
  
  // Verificar si debugConsole ya existe
  if (window.debugConsole && typeof window.debugConsole.getLogs === 'function') {
    console.log('%c✅ Debug Console ya está disponible', 'color: #10b981; font-weight: bold;');
    console.log('Usa: window.debugConsole.getLogs()');
    return window.debugConsole;
  }
  
  // Si no existe, intentar cargar los logs desde localStorage
  console.log('%c⚠️ Debug Console no está disponible, intentando cargar desde localStorage...', 'color: #f59e0b;');
  
  try {
    const saved = localStorage.getItem('debug-console-logs');
    if (saved) {
      const logs = JSON.parse(saved);
      console.log(\`✅ Se encontraron \${logs.length} logs guardados\`);
      
      // Crear un objeto simple para acceder a los logs
      const debugHelper = {
        logs: logs,
        getLogs: () => logs,
        exportLogs: () => JSON.stringify(logs, null, 2),
        clearLogs: () => {
          localStorage.removeItem('debug-console-logs');
          console.log('✅ Logs limpiados');
        },
        showErrors: () => {
          const errors = logs.filter(l => l.type === 'error');
          console.table(errors);
          return errors;
        },
        showLatest: (count = 10) => {
          const latest = logs.slice(0, count);
          latest.forEach((log, i) => {
            const color = log.type === 'error' ? '#ef4444' : log.type === 'warn' ? '#f59e0b' : '#3b82f6';
            console.log(\`%c[\${log.type.toUpperCase()}] \${log.message}\`, \`color: \${color}; font-weight: bold;\`);
            if (log.stack) {
              console.log('%cStack:', 'color: #6b7280;', log.stack);
            }
          });
          return latest;
        }
      };
      
      Object.defineProperty(window, 'debugConsole', {
        value: debugHelper,
        writable: true,
        configurable: true,
        enumerable: true
      });
      
      window.$debug = debugHelper;
      
      console.log('%c✅ Debug Helper creado desde localStorage', 'color: #10b981; font-weight: bold;');
      console.log('%cComandos disponibles:', 'color: #6b7280;');
      console.log('  - debugConsole.getLogs() - Todos los logs');
      console.log('  - debugConsole.showErrors() - Solo errores (tabla)');
      console.log('  - debugConsole.showLatest(10) - Últimos 10 logs');
      console.log('  - debugConsole.exportLogs() - Exportar como JSON');
      
      return debugHelper;
    } else {
      console.warn('❌ No hay logs guardados en localStorage');
      console.log('💡 Recarga la página y espera a que se active el Debug Console');
      return null;
    }
  } catch (error) {
    console.error('❌ Error al cargar logs:', error);
    return null;
  }
})();
`;

export { debugHelperScript };

// También exportar función para ejecutar desde código
export function setupConsoleHelpers() {
  if (typeof window === 'undefined') return;
  
  // Ejecutar el script helper
  try {
    // eslint-disable-next-line no-eval
    const helper = eval(debugHelperScript);
    return helper;
  } catch (error) {
    console.error('Error al configurar console helpers:', error);
    return null;
  }
}

