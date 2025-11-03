/**
 * Herramienta de debugging para capturar y reportar errores de consola
 * 
 * Este script captura todos los errores de la consola del navegador y los
 * guarda en localStorage y los muestra en una UI flotante para debugging
 */

interface ErrorLog {
  timestamp: string;
  type: 'error' | 'warn' | 'info' | 'log';
  message: string;
  stack?: string;
  source?: string;
  line?: number;
  col?: number;
  url?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

class DebugConsole {
  private logs: ErrorLog[] = [];
  private maxLogs = 100;
  private panel: HTMLDivElement | null = null;
  private isPanelVisible = false;
  private isLogging = false; // Guard para prevenir recursión infinita

  constructor() {
    if (typeof window === 'undefined') return;
    
    this.loadLogs();
    this.setupErrorHandlers();
    this.createDebugPanel();
  }

  private loadLogs() {
    try {
      const saved = localStorage.getItem('debug-console-logs');
      if (saved) {
        this.logs = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('No se pudieron cargar logs guardados', e);
    }
  }

  private saveLogs() {
    try {
      localStorage.setItem('debug-console-logs', JSON.stringify(this.logs));
    } catch (e) {
      console.warn('No se pudieron guardar logs', e);
    }
  }

  private setupErrorHandlers() {
    // Capturar errores de JavaScript
    window.addEventListener('error', (event) => {
      this.log({
        type: 'error',
        message: event.message,
        stack: event.error?.stack,
        source: event.filename,
        line: event.lineno,
        col: event.colno,
        url: window.location.href,
        userAgent: navigator.userAgent,
        details: {
          error: event.error?.toString(),
          type: event.error?.constructor?.name,
        },
      });
    });

    // Capturar promesas rechazadas sin catch
    window.addEventListener('unhandledrejection', (event) => {
      this.log({
        type: 'error',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        details: {
          reason: String(event.reason),
          type: event.reason?.constructor?.name,
        },
      });
    });

    // Interceptar console.error
    // AI_DECISION: Agregar guard para prevenir recursión infinita
    // Justificación: Si log() llama a console.error durante logging, crea un loop infinito.
    // El guard isLogging previene que se intercepten logs generados por el propio debug-console.
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      originalError.apply(console, args);
      
      // Guard: evitar interceptar errores mientras estamos logueando (previene recursión)
      if (this.isLogging) {
        return;
      }
      
      // Filtrar mensajes del logger para evitar loops
      const message = args.map(arg => String(arg)).join(' ');
      if (message.includes('[Logger]') || message.includes('Failed to send log to backend')) {
        return; // Ignorar errores del logger para evitar recursión
      }
      
      const errorArg = args.find(arg => arg instanceof Error) as Error | undefined;
      this.log({
        type: 'error',
        message: args.map(arg => {
          if (arg instanceof Error) {
            return arg.message;
          }
          return String(arg);
        }).join(' '),
        ...(errorArg?.stack && { stack: errorArg.stack }),
        url: window.location.href,
        details: {
          args: args.map(arg => {
            if (arg instanceof Error) {
              return {
                message: arg.message,
                ...(arg.stack && { stack: arg.stack }),
                name: arg.name,
              };
            }
            return String(arg);
          }),
        },
      });
    };

    // Interceptar console.warn
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      originalWarn.apply(console, args);
      
      // Guard: evitar interceptar warnings mientras estamos logueando (previene recursión)
      if (this.isLogging) {
        return;
      }
      
      // Filtrar mensajes del logger para evitar loops
      const message = args.map(arg => String(arg)).join(' ');
      if (message.includes('[Logger]')) {
        return; // Ignorar warnings del logger para evitar recursión
      }
      
      this.log({
        type: 'warn',
        message: args.map(arg => String(arg)).join(' '),
        url: window.location.href,
      });
    };
  }

  private log(errorLog: Partial<ErrorLog>) {
    // Guard: prevenir recursión infinita
    if (this.isLogging) {
      return;
    }

    this.isLogging = true;
    try {
      const completeLog: ErrorLog = {
        timestamp: new Date().toISOString(),
        type: errorLog.type || 'log',
        message: errorLog.message || '',
        ...(errorLog.stack && { stack: errorLog.stack }),
        ...(errorLog.source && { source: errorLog.source }),
        ...(errorLog.line && { line: errorLog.line }),
        ...(errorLog.col && { col: errorLog.col }),
        ...(errorLog.url && { url: errorLog.url }),
        ...(errorLog.userAgent && { userAgent: errorLog.userAgent }),
        ...(errorLog.details && { details: errorLog.details }),
      };
      this.logs.unshift(completeLog);
      
      // Limitar número de logs
      if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(0, this.maxLogs);
      }
      
      this.saveLogs();
      
      // Mostrar en panel si está visible
      if (this.isPanelVisible && this.panel) {
        this.updatePanel();
      }
      
      // En desarrollo, mostrar errores críticos (pero sin usar console.error para evitar loops)
      if (errorLog.type === 'error' && process.env.NODE_ENV === 'development') {
        // Usar console.group y console.log en lugar de console.error para evitar recursión
        console.group('🔴 Error capturado por Debug Console');
        console.log('Mensaje:', errorLog.message);
        if (errorLog.stack) {
          console.log('Stack:', errorLog.stack);
        }
        console.log('URL:', errorLog.url);
        console.log('Detalles completos:', errorLog);
        console.groupEnd();
      }
    } finally {
      this.isLogging = false;
    }
  }

  private createDebugPanel() {
    if (typeof document === 'undefined') return;

    // Crear botón flotante
    const button = document.createElement('button');
    button.textContent = '🐛';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: #ef4444;
      color: white;
      border: none;
      cursor: pointer;
      font-size: 24px;
      z-index: 10000;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    `;
    button.onclick = () => this.togglePanel();

    // Crear panel de debugging
    this.panel = document.createElement('div');
    this.panel.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 600px;
      max-height: 500px;
      background: white;
      border: 2px solid #ef4444;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      z-index: 10001;
      display: none;
      flex-direction: column;
      font-family: monospace;
      font-size: 12px;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      padding: 10px;
      background: #ef4444;
      color: white;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    header.innerHTML = `
      <span>🐛 Debug Console (${this.logs.length} errores)</span>
      <button id="debug-close" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px;">✕</button>
    `;
    header.querySelector('#debug-close')?.addEventListener('click', () => this.togglePanel());

    const content = document.createElement('div');
    content.id = 'debug-content';
    content.style.cssText = `
      overflow-y: auto;
      padding: 10px;
      max-height: 400px;
    `;

    this.panel.appendChild(header);
    this.panel.appendChild(content);

    document.body.appendChild(button);
    document.body.appendChild(this.panel);
  }

  private togglePanel() {
    if (!this.panel) return;
    
    this.isPanelVisible = !this.isPanelVisible;
    this.panel.style.display = this.isPanelVisible ? 'flex' : 'none';
    
    if (this.isPanelVisible) {
      this.updatePanel();
    }
  }

  private updatePanel() {
    if (!this.panel) return;
    
    const content = this.panel.querySelector('#debug-content');
    if (!content) return;

    const errorCount = this.logs.filter(l => l.type === 'error').length;
    const header = this.panel.querySelector('div');
    if (header) {
      header.innerHTML = header.innerHTML.replace(/\d+ errores/, `${errorCount} errores`);
    }

    content.innerHTML = this.logs.map((log, index) => {
      const color = log.type === 'error' ? '#ef4444' : log.type === 'warn' ? '#f59e0b' : '#3b82f6';
      
      return `
        <div style="
          margin-bottom: 10px;
          padding: 10px;
          border-left: 4px solid ${color};
          background: #f9fafb;
          border-radius: 4px;
        ">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span style="font-weight: bold; color: ${color};">[${log.type.toUpperCase()}]</span>
            <span style="color: #6b7280; font-size: 10px;">${new Date(log.timestamp).toLocaleTimeString()}</span>
          </div>
          <div style="color: #1f2937; margin-bottom: 5px;">${this.escapeHtml(log.message)}</div>
          ${log.stack ? `<pre style="font-size: 10px; color: #6b7280; overflow-x: auto; margin-top: 5px;">${this.escapeHtml(log.stack)}</pre>` : ''}
          ${log.url ? `<div style="font-size: 10px; color: #6b7280; margin-top: 5px;">URL: ${this.escapeHtml(log.url)}</div>` : ''}
          ${log.details ? `<details style="margin-top: 5px;"><summary style="cursor: pointer; color: #6b7280;">Detalles</summary><pre style="font-size: 10px; color: #6b7280; margin-top: 5px;">${JSON.stringify(log.details, null, 2)}</pre></details>` : ''}
        </div>
      `;
    }).join('');

    // Scroll al top
    content.scrollTop = 0;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Método público para obtener logs
  getLogs(): ErrorLog[] {
    return [...this.logs];
  }

  // Método público para exportar logs
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Método público para limpiar logs
  clearLogs() {
    this.logs = [];
    this.saveLogs();
    if (this.isPanelVisible) {
      this.updatePanel();
    }
  }
}

// Exportar la clase para inicialización manual
export { DebugConsole, type ErrorLog };

// Función de inicialización que se puede llamar desde el componente
export function initDebugConsole() {
  if (typeof window === 'undefined') return null;
  
  try {
    const debugConsole = new DebugConsole();
    
    // Exponer globalmente para acceso desde consola del navegador
    // Usar Object.defineProperty para asegurar que se pueda sobrescribir
    Object.defineProperty(window, 'debugConsole', {
      value: debugConsole,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    
    // También crear alias directo para facilitar acceso
    (window as unknown as { $debug: DebugConsole }).$debug = debugConsole;
    
    console.log('%c🐛 Debug Console activado', 'color: #ef4444; font-weight: bold; font-size: 14px;');
    console.log('%cUsa window.debugConsole o window.$debug para acceder a los métodos:', 'color: #6b7280;');
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

// Inicializar automáticamente si estamos en el navegador y en desarrollo
// Esto asegura que esté disponible incluso antes de que React se monte
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Esperar a que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => initDebugConsole(), 100);
    });
  } else {
    setTimeout(() => initDebugConsole(), 100);
  }
}

