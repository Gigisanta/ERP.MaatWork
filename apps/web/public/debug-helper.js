/**
 * Script de debugging que se puede cargar directamente desde el navegador
 * 
 * CÓMO USAR:
 * 1. Abre DevTools (F12)
 * 2. Ve a la pestaña "Sources"
 * 3. En el panel izquierdo, busca "Snippets" o "Sources" → "Snippets"
 * 4. Click derecho → "New snippet"
 * 5. Pega este código
 * 6. Guarda (Ctrl+S)
 * 7. Click derecho en el snippet → "Run"
 * 
 * O usa la consola multi-línea:
 * 1. Abre Console
 * 2. Presiona Shift+Enter para nueva línea
 * 3. Copia el código línea por línea o sección por sección
 */

(function() {
  'use strict';
  
  console.log('%c🔄 Inicializando Debug Helper...', 'color: #3b82f6; font-weight: bold; font-size: 14px;');
  
  // Función para obtener logs desde localStorage
  function getDebugLogs() {
    try {
      const saved = localStorage.getItem('debug-console-logs');
      if (!saved) return [];
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error al cargar logs:', e);
      return [];
    }
  }
  
  // Crear helper que siempre esté disponible
  const debugHelper = {
    logs: getDebugLogs(),
    
    getLogs: function() {
      const logs = getDebugLogs();
      console.log(`%cTotal de logs: ${logs.length}`, 'color: #3b82f6; font-weight: bold;');
      return logs;
    },
    
    showErrors: function() {
      const logs = getDebugLogs();
      const errors = logs.filter(l => l.type === 'error');
      console.log(`%cErrores encontrados: ${errors.length}`, 'color: #ef4444; font-weight: bold;');
      if (errors.length > 0) {
        console.table(errors);
      }
      return errors;
    },
    
    getLastError: function() {
      const logs = getDebugLogs();
      const lastError = logs.find(l => l.type === 'error');
      if (lastError) {
        console.group('%cÚLTIMO ERROR', 'color: #ef4444; font-weight: bold; font-size: 16px;');
        console.log('Mensaje:', lastError.message);
        if (lastError.stack) {
          console.log('Stack:', lastError.stack);
        }
        if (lastError.url) {
          console.log('URL:', lastError.url);
        }
        if (lastError.source) {
          console.log('Archivo:', lastError.source);
        }
        if (lastError.line) {
          console.log('Línea:', lastError.line, 'Columna:', lastError.col);
        }
        if (lastError.details) {
          console.log('Detalles:', lastError.details);
        }
        console.groupEnd();
        return lastError;
      } else {
        console.log('%cNo se encontraron errores', 'color: #10b981;');
        return null;
      }
    },
    
    showLatest: function(count) {
      const logs = getDebugLogs();
      const latest = logs.slice(0, count || 10);
      console.log(`%cÚltimos ${latest.length} logs:`, 'color: #3b82f6; font-weight: bold;');
      latest.forEach((log) => {
        const color = log.type === 'error' ? '#ef4444' : log.type === 'warn' ? '#f59e0b' : '#3b82f6';
        console.log(`%c[${log.type.toUpperCase()}] ${log.message}`, `color: ${color}; font-weight: bold;`);
        if (log.stack) {
          console.log('%c  Stack:', 'color: #6b7280;', log.stack);
        }
      });
      return latest;
    },
    
    findInLogs: function(searchTerm) {
      const logs = getDebugLogs();
      const searchLower = searchTerm.toLowerCase();
      const results = logs.filter(l => 
        (l.message && l.message.toLowerCase().includes(searchLower)) ||
        (l.stack && l.stack.toLowerCase().includes(searchLower)) ||
        (l.url && l.url.toLowerCase().includes(searchLower))
      );
      console.log(`%cResultados para "${searchTerm}": ${results.length}`, 'color: #3b82f6; font-weight: bold;');
      if (results.length > 0) {
        console.table(results);
      }
      return results;
    },
    
    exportLogs: function() {
      const logs = getDebugLogs();
      const json = JSON.stringify(logs, null, 2);
      console.log('%cJSON exportado (ver abajo):', 'color: #3b82f6; font-weight: bold;');
      console.log(json);
      return json;
    },
    
    copyLogs: function() {
      const logs = getDebugLogs();
      const json = JSON.stringify(logs, null, 2);
      
      // Intentar usar Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(json).then(() => {
          console.log('%c✅ Logs copiados al portapapeles', 'color: #10b981; font-weight: bold;');
        }).catch((err) => {
          console.warn('⚠️ No se pudo copiar automáticamente:', err);
          console.log('JSON:', json);
        });
      } else {
        console.warn('⚠️ Clipboard API no disponible');
        console.log('JSON:', json);
      }
      
      return json;
    },
    
    clearLogs: function() {
      localStorage.removeItem('debug-console-logs');
      console.log('%c✅ Logs limpiados', 'color: #10b981; font-weight: bold;');
      debugHelper.logs = [];
    },
    
    inspectError: function(index) {
      const logs = getDebugLogs();
      const errors = logs.filter(l => l.type === 'error');
      const error = errors[index || 0];
      
      if (error) {
        console.group(`%cError #${index || 0}`, 'color: #ef4444; font-weight: bold;');
        console.log('Timestamp:', error.timestamp);
        console.log('Mensaje:', error.message);
        if (error.stack) {
          console.log('Stack:', error.stack);
        }
        if (error.url) {
          console.log('URL:', error.url);
        }
        if (error.source) {
          console.log('Archivo:', error.source, `Línea: ${error.line}:${error.col}`);
        }
        if (error.details) {
          console.log('Detalles:', error.details);
        }
        console.groupEnd();
        return error;
      } else {
        console.warn(`No se encontró el error #${index || 0}`);
        return null;
      }
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
  const logs = getDebugLogs();
  const errors = logs.filter(l => l.type === 'error').length;
  const warnings = logs.filter(l => l.type === 'warn').length;
  
  console.log('%c✅ Debug Helper disponible', 'color: #10b981; font-weight: bold; font-size: 16px;');
  console.log('%c📋 Comandos disponibles:', 'color: #3b82f6; font-weight: bold;');
  console.log('  debugConsole.getLogs()           - Todos los logs');
  console.log('  debugConsole.showErrors()       - Solo errores (tabla)');
  console.log('  debugConsole.getLastError()      - Último error con detalles');
  console.log('  debugConsole.inspectError(0)    - Inspeccionar error específico');
  console.log('  debugConsole.showLatest(10)     - Últimos N logs');
  console.log('  debugConsole.findInLogs("text") - Buscar en logs');
  console.log('  debugConsole.exportLogs()       - Exportar como JSON');
  console.log('  debugConsole.copyLogs()         - Copiar logs al portapapeles');
  console.log('  debugConsole.clearLogs()        - Limpiar logs');
  console.log('');
  console.log('%c💡 También puedes usar: $debug.getLogs()', 'color: #6b7280;');
  
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

