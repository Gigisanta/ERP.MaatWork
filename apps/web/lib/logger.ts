/**
 * Logger estructurado para el frontend Next.js
 * Reemplaza console.log con logging estructurado y correlación con API
 * REGLA CURSOR: No cambiar estructura de logs, mantener formato JSON, preservar correlación con backend
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
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
    context?: Record<string, any>
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

  private async sendToBackend(entry: LogEntry): Promise<void> {
    try {
      // Importar config dinámicamente para evitar ciclos de dependencia
      const { config } = await import('./config');
      await fetch(`${config.apiUrl}/logs/client`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry)
      });
    } catch (error) {
      // Fallback a console si no se puede enviar al backend
      console.error('Failed to send log to backend:', error);
    }
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry(level, message, context);
    
    if (process.env.NODE_ENV === 'production') {
      // En producción, enviar a backend
      this.sendToBackend(entry).catch(() => {
        // Si falla el envío, usar console como fallback
        console[level === 'debug' ? 'log' : level](`[${level.toUpperCase()}] ${message}`, context);
      });
    } else {
      // En desarrollo, usar console con formato detallado
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
      
      // Usar console.group para logs más organizados
      console.groupCollapsed(`${prefix} ${message}`);
      console[level === 'debug' ? 'log' : level](logData);
      if (context?.error || context?.err) {
        console.error('Error details:', context.error || context.err);
      }
      console.groupEnd();
    }
  }

  /**
   * Log de debug - información detallada para desarrollo
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log('debug', message, context);
  }

  /**
   * Log de información - eventos importantes del flujo de la aplicación
   */
  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  /**
   * Log de advertencia - situaciones anómalas que no interrumpen el flujo
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }

  /**
   * Log de error - errores que requieren atención
   */
  error(message: string, context?: Record<string, any>): void {
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
    context?: Record<string, any>
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
    context?: Record<string, any>
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
    context?: Record<string, any>
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
