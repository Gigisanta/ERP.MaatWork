/**
 * SCRIPT PARA PEGAR DIRECTAMENTE EN LA CONSOLA DEL NAVEGADOR
 * 
 * Copia y pega todo este código en la consola del navegador (F12 → Console)
 * Funciona incluso si el Debug Console no se ha cargado
 */

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
  
  // Crear helper que siempre esté disponible
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
      console.log(`%cSe encontraron ${errors.length} errores`, 'color: #ef4444; font-weight: bold;');
      return errors;
    },
    showLatest: (count = 10) => {
      const logs = getDebugLogs();
      const latest = logs.slice(0, count);
      console.log(`%cÚltimos ${latest.length} logs:`, 'color: #3b82f6; font-weight: bold;');
      latest.forEach((log) => {
        const color = log.type === 'error' ? '#ef4444' : log.type === 'warn' ? '#f59e0b' : '#3b82f6';
        console.log(`%c[${log.type.toUpperCase()}] ${log.message}`, `color: ${color}; font-weight: bold;`);
        if (log.stack) {
          console.log('%cStack:', 'color: #6b7280;', log.stack);
        }
        if (log.url) {
          console.log('%cURL:', 'color: #6b7280;', log.url);
        }
      });
      return latest;
    },
    findInLogs: (searchTerm) => {
      const logs = getDebugLogs();
      const searchLower = searchTerm.toLowerCase();
      const results = logs.filter(l => 
        l.message?.toLowerCase().includes(searchLower) ||
        l.stack?.toLowerCase().includes(searchLower) ||
        l.url?.toLowerCase().includes(searchLower)
      );
      console.table(results);
      console.log(`%cSe encontraron ${results.length} resultados para "${searchTerm}"`, 'color: #3b82f6; font-weight: bold;');
      return results;
    },
    getLastError: () => {
      const logs = getDebugLogs();
      const lastError = logs.find(l => l.type === 'error');
      if (lastError) {
        console.log('%cÚLTIMO ERROR:', 'color: #ef4444; font-weight: bold; font-size: 16px;');
        console.log('Mensaje:', lastError.message);
        if (lastError.stack) {
          console.log('Stack:', lastError.stack);
        }
        if (lastError.url) {
          console.log('URL:', lastError.url);
        }
        if (lastError.details) {
          console.log('Detalles:', lastError.details);
        }
        return lastError;
      } else {
        console.log('%cNo se encontraron errores', 'color: #10b981;');
        return null;
      }
    },
    copyLogs: () => {
      const logs = getDebugLogs();
      const json = JSON.stringify(logs, null, 2);
      
      // Intentar usar Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(json).then(() => {
          console.log('✅ Logs copiados al portapapeles');
        }).catch(() => {
          console.log('⚠️ No se pudo copiar automáticamente, usa copy() manualmente');
          console.log('JSON:', json);
        });
      } else {
        // Fallback: usar el comando copy() si está disponible
        if (typeof copy === 'function') {
          copy(json);
          console.log('✅ Logs copiados al portapapeles');
        } else {
          console.log('⚠️ Usa debugHelper.exportLogs() y copia manualmente');
          console.log('JSON:', json);
        }
      }
      
      return json;
    }
  };
  
  // Crear o actualizar window.debugConsole
  Object.defineProperty(window, 'debugConsole', {
    value: debugHelper,
    writable: true,
    configurable: true,
    enumerable: true,
  });
  
  // También crear alias $debug
  Object.defineProperty(window, '$debug', {
    value: debugHelper,
    writable: true,
    configurable: true,
    enumerable: true,
  });
  
  // Mostrar mensaje de ayuda
  console.log('%c✅ Debug Helper disponible', 'color: #10b981; font-weight: bold; font-size: 16px;');
  console.log('%c📋 Comandos disponibles:', 'color: #3b82f6; font-weight: bold;');
  console.log('  debugConsole.getLogs()           - Todos los logs');
  console.log('  debugConsole.showErrors()       - Solo errores (tabla)');
  console.log('  debugConsole.getLastError()     - Último error con detalles');
  console.log('  debugConsole.showLatest(10)      - Últimos N logs');
  console.log('  debugConsole.findInLogs("text")  - Buscar en logs');
  console.log('  debugConsole.exportLogs()        - Exportar como JSON');
  console.log('  debugConsole.copyLogs()          - Copiar logs al portapapeles');
  console.log('  debugConsole.clearLogs()        - Limpiar logs');
  console.log('');
  console.log('%c💡 También puedes usar: $debug.getLogs()', 'color: #6b7280;');
  
  // Mostrar estadísticas rápidas
  const logs = getDebugLogs();
  const errors = logs.filter(l => l.type === 'error').length;
  const warnings = logs.filter(l => l.type === 'warn').length;
  
  if (logs.length > 0) {
    console.log('');
    console.log('%c📊 Estadísticas:', 'color: #3b82f6; font-weight: bold;');
    console.log(`  Total de logs: ${logs.length}`);
    console.log(`  Errores: ${errors}`);
    console.log(`  Advertencias: ${warnings}`);
    
    if (errors > 0) {
      console.log('');
      console.log('%c⚠️ Hay errores registrados. Usa debugConsole.showErrors() para verlos', 'color: #ef4444; font-weight: bold;');
    }
  }
  
  return debugHelper;
})();

