/**
 * Logger estructurado para el frontend Next.js
 * Reemplaza console.log con logging estructurado y correlación con API
 * REGLA CURSOR: No cambiar estructura de logs, mantener formato JSON, preservar correlación con backend
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Tipo para valores de contexto en logs
 * Permite cualquier valor JSON-serializable
 */
export type LogContextValue = string | number | boolean | null | undefined | LogContextValue[] | { [key: string]: LogContextValue };

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, LogContextValue>;
  userAgent?: string | undefined;
  url?: string | undefined;
  requestId?: string;
  userId?: string | undefined;
  userRole?: string | undefined;
  sessionId?: string;
}

class ClientLogger {
  private sessionId: string;
  private userId: string | null = null;
  private userRole: string | null = null;
  private isSendingLog = false; // Guard para prevenir recursión
  private backendErrorCount = 0; // Contador de errores consecutivos al backend
  private readonly MAX_BACKEND_ERRORS = 3; // Desactivar envío al backend después de 3 errores

  constructor() {
    // Generar sessionId único para esta sesión del navegador
    this.sessionId = this.generateSessionId();
    
    // Intentar obtener datos de usuario del localStorage
    if (typeof window !== 'undefined') {
      try {
        const token = localStorage.getItem('cactus_token');
        if (token) {
          // Decodificar token JWT para obtener userId y role (sin verificar firma)
          const payload = JSON.parse(atob(token.split('.')[1]));
          this.userId = payload.id;
          this.userRole = payload.role;
        }
      } catch (error) {
        // Ignorar errores de decodificación de token
      }
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, LogContextValue>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userId: this.userId || undefined,
      userRole: this.userRole || undefined,
      sessionId: this.sessionId
    };
  }

  // AI_DECISION: Protección contra recursión infinita en sendToBackend
  // Justificación: Si sendToBackend falla y ese error se loguea, podría crear un loop infinito.
  // Agregar guards previene que el logger se llame a sí mismo infinitamente.
  private async sendToBackend(entry: LogEntry): Promise<void> {
    // Guard: prevenir recursión si ya estamos enviando un log
    if (this.isSendingLog) {
      return;
    }

    // Guard: desactivar envío al backend si hay demasiados errores consecutivos
    if (this.backendErrorCount >= this.MAX_BACKEND_ERRORS) {
      return;
    }

    // En desarrollo, no enviar logs al backend para evitar problemas
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    this.isSendingLog = true;
    let timeoutId: NodeJS.Timeout | undefined;
    try {
      // Importar config dinámicamente para evitar ciclos de dependencia
      const { config } = await import('./config');
      
      // Crear AbortController para timeout (compatible con navegadores antiguos)
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${config.apiUrl}/logs/client`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
        signal: controller.signal
      });
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Si fue exitoso, resetear contador de errores
      if (response.ok) {
        this.backendErrorCount = 0;
      } else {
        this.backendErrorCount++;
      }
    } catch (error) {
      // Asegurar que el timeout se limpie incluso si hay error
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      this.backendErrorCount++;
      // NO loguear este error para evitar recursión
      // Solo usar console.error directamente sin pasar por el logger
      if (this.backendErrorCount < this.MAX_BACKEND_ERRORS) {
        // Solo mostrar error las primeras veces
        console.error('[Logger] Failed to send log to backend (will disable after 3 failures):', error);
      }
    } finally {
      this.isSendingLog = false;
    }
  }

  private log(level: LogLevel, message: string, context?: Record<string, LogContextValue>): void {
    // Guard: prevenir logging durante envío de logs al backend
    if (this.isSendingLog) {
      // Solo loguear críticos durante envío
      if (level === 'error') {
        console.error(`[${level.toUpperCase()}] ${message}`, context);
      }
      return;
    }

    const entry = this.createLogEntry(level, message, context);
    
    // Siempre mostrar en console primero para desarrollo
    const prefix = `[${entry.timestamp}] [FRONTEND] [${level.toUpperCase()}]`;
    const logData = {
      message,
      ...context,
      sessionId: entry.sessionId,
      userId: entry.userId,
      userRole: entry.userRole,
      url: entry.url,
      userAgent: entry.userAgent
    };
    
    // Usar console.group para logs más organizados (solo en desarrollo)
    if (process.env.NODE_ENV !== 'production') {
      console.groupCollapsed(`${prefix} ${message}`);
      console[level === 'debug' ? 'log' : level](logData);
      if (context?.error || context?.err) {
        console.error('Error details:', context.error || context.err);
      }
      console.groupEnd();
    } else {
      // En producción, usar console simple
      console[level === 'debug' ? 'log' : level](`[${level.toUpperCase()}] ${message}`, logData);
    }

    // Intentar enviar al backend (solo en producción y si no hay demasiados errores)
    if (process.env.NODE_ENV === 'production' && this.backendErrorCount < this.MAX_BACKEND_ERRORS) {
      // No esperar para no bloquear
      this.sendToBackend(entry).catch(() => {
        // Silenciar errores aquí para evitar recursión
      });
    }
  }

  /**
   * Log de debug - información detallada para desarrollo
   */
  debug(message: string, context?: Record<string, LogContextValue>): void {
    this.log('debug', message, context);
  }

  /**
   * Log de información - eventos importantes del flujo de la aplicación
   */
  info(message: string, context?: Record<string, LogContextValue>): void {
    this.log('info', message, context);
  }

  /**
   * Log de advertencia - situaciones anómalas que no interrumpen el flujo
   */
  warn(message: string, context?: Record<string, LogContextValue>): void {
    this.log('warn', message, context);
  }

  /**
   * Log de error - errores que requieren atención
   */
  error(message: string, context?: Record<string, LogContextValue>): void {
    this.log('error', message, context);
  }

  /**
   * Actualizar datos de usuario (llamar después de login/logout)
   */
  updateUser(userId: string | null, userRole: string | null): void {
    this.userId = userId;
    this.userRole = userRole;
  }

  /**
   * Log específico para requests HTTP con correlación
   */
  logRequest(
    method: string,
    url: string,
    requestId: string,
    context?: Record<string, LogContextValue>
  ): void {
    this.info(`HTTP ${method} ${url}`, {
      ...context,
      requestId,
      method,
      url
    });
  }

  /**
   * Log específico para respuestas HTTP
   */
  logResponse(
    method: string,
    url: string,
    status: number,
    duration: number,
    requestId: string,
    context?: Record<string, LogContextValue>
  ): void {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
    this.log(level, `HTTP ${method} ${url} - ${status}`, {
      ...context,
      requestId,
      method,
      url,
      status,
      duration
    });
  }

  /**
   * Log específico para errores de red
   */
  logNetworkError(
    method: string,
    url: string,
    error: Error,
    requestId: string,
    context?: Record<string, LogContextValue>
  ): void {
    this.error(`Network error: ${method} ${url}`, {
      ...context,
      requestId,
      method,
      url,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
  }
}

// Instancia singleton del logger
export const logger = new ClientLogger();

// Exportar también la clase para testing
export { ClientLogger };
