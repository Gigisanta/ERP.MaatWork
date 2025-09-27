/**
 * Sistema de logging robusto para debugging en producción
 * Incluye diferentes niveles de log, formateo y persistencia
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  error?: Error;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableRemote: boolean;
  maxFileSize: number;
  maxFiles: number;
  remoteEndpoint?: string;
  context?: string;
}

class Logger {
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: false,
      enableRemote: false,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      context: 'app',
      ...config
    };

    // Configurar flush automático cada 5 segundos
    if (this.config.enableFile || this.config.enableRemote) {
      this.flushInterval = setInterval(() => {
        this.flush();
      }, 5000);
    }

    // Manejar cierre de aplicación
    if (typeof process !== 'undefined') {
      process.on('beforeExit', () => this.flush());
      process.on('SIGINT', () => {
        this.flush();
        process.exit(0);
      });
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.config.level;
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp;
    const level = LogLevel[entry.level].padEnd(5);
    const context = entry.context ? `[${entry.context}]` : '';
    const metadata = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : '';
    const error = entry.error ? `\n${entry.error.stack}` : '';
    
    return `${timestamp} ${level} ${context} ${entry.message}${metadata}${error}`;
  }

  private getColorForLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR: return '\x1b[31m'; // Red
      case LogLevel.WARN: return '\x1b[33m';  // Yellow
      case LogLevel.INFO: return '\x1b[36m';  // Cyan
      case LogLevel.DEBUG: return '\x1b[35m'; // Magenta
      case LogLevel.TRACE: return '\x1b[37m'; // White
      default: return '\x1b[0m';
    }
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const color = this.getColorForLevel(entry.level);
    const reset = '\x1b[0m';
    const message = this.formatMessage(entry);

    console.log(`${color}${message}${reset}`);
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);
    
    // Limitar buffer a 1000 entradas
    if (this.logBuffer.length > 1000) {
      this.logBuffer = this.logBuffer.slice(-1000);
    }
  }

  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const entries = [...this.logBuffer];
    this.logBuffer = [];

    // Escribir a archivo si está habilitado
    if (this.config.enableFile && typeof require !== 'undefined') {
      try {
        const fs = require('fs').promises;
        const path = require('path');
        
        const logDir = path.join(process.cwd(), 'logs');
        await fs.mkdir(logDir, { recursive: true });
        
        const logFile = path.join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`);
        const logContent = entries.map(entry => this.formatMessage(entry)).join('\n') + '\n';
        
        await fs.appendFile(logFile, logContent);
      } catch (error) {
        console.error('Error escribiendo logs a archivo:', error);
      }
    }

    // Enviar a endpoint remoto si está habilitado
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      try {
        const response = await fetch(this.config.remoteEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ logs: entries })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.error('Error enviando logs remotos:', error);
      }
    }
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.config.context,
      metadata,
      error,
      // Agregar información de contexto si está disponible
      userId: metadata?.userId,
      sessionId: metadata?.sessionId,
      requestId: metadata?.requestId
    };

    this.logToConsole(entry);
    this.addToBuffer(entry);
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, metadata, error);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  trace(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.TRACE, message, metadata);
  }

  // Métodos de conveniencia para contextos específicos
  api(method: string, path: string, statusCode: number, duration: number, metadata?: Record<string, any>): void {
    this.info(`${method} ${path} ${statusCode} ${duration}ms`, {
      type: 'api',
      method,
      path,
      statusCode,
      duration,
      ...metadata
    });
  }

  database(operation: string, table: string, duration: number, metadata?: Record<string, any>): void {
    this.debug(`DB ${operation} ${table} ${duration}ms`, {
      type: 'database',
      operation,
      table,
      duration,
      ...metadata
    });
  }

  notion(operation: string, resource: string, metadata?: Record<string, any>): void {
    this.info(`Notion ${operation} ${resource}`, {
      type: 'notion',
      operation,
      resource,
      ...metadata
    });
  }

  auth(event: string, userId?: string, metadata?: Record<string, any>): void {
    this.info(`Auth ${event}`, {
      type: 'auth',
      event,
      userId,
      ...metadata
    });
  }

  performance(operation: string, duration: number, metadata?: Record<string, any>): void {
    const level = duration > 1000 ? LogLevel.WARN : LogLevel.DEBUG;
    this.log(level, `Performance ${operation} ${duration}ms`, {
      type: 'performance',
      operation,
      duration,
      ...metadata
    });
  }

  // Crear logger con contexto específico
  child(context: string, metadata?: Record<string, any>): Logger {
    return new Logger({
      ...this.config,
      context: `${this.config.context}:${context}`
    });
  }

  // Configurar nivel de log dinámicamente
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  // Obtener estadísticas de logging
  getStats(): { bufferSize: number; config: LoggerConfig } {
    return {
      bufferSize: this.logBuffer.length,
      config: { ...this.config }
    };
  }

  // Limpiar recursos
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }
}

// Instancia global del logger
const globalLogger = new Logger({
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  enableFile: process.env.NODE_ENV === 'production',
  enableRemote: false,
  context: 'crm'
});

// Exportar instancia global y clase
export { Logger };
export default globalLogger;

// Funciones de conveniencia
export const log = {
  error: (message: string, error?: Error, metadata?: Record<string, any>) => 
    globalLogger.error(message, error, metadata),
  warn: (message: string, metadata?: Record<string, any>) => 
    globalLogger.warn(message, metadata),
  info: (message: string, metadata?: Record<string, any>) => 
    globalLogger.info(message, metadata),
  debug: (message: string, metadata?: Record<string, any>) => 
    globalLogger.debug(message, metadata),
  trace: (message: string, metadata?: Record<string, any>) => 
    globalLogger.trace(message, metadata),
  api: (method: string, path: string, statusCode: number, duration: number, metadata?: Record<string, any>) => 
    globalLogger.api(method, path, statusCode, duration, metadata),
  database: (operation: string, table: string, duration: number, metadata?: Record<string, any>) => 
    globalLogger.database(operation, table, duration, metadata),
  notion: (operation: string, resource: string, metadata?: Record<string, any>) => 
    globalLogger.notion(operation, resource, metadata),
  auth: (event: string, userId?: string, metadata?: Record<string, any>) => 
    globalLogger.auth(event, userId, metadata),
  performance: (operation: string, duration: number, metadata?: Record<string, any>) => 
    globalLogger.performance(operation, duration, metadata)
};

// Middleware para Express (si está disponible)
export function createLoggerMiddleware() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    
    // Agregar requestId al request
    req.requestId = requestId;
    
    // Log de request
    globalLogger.api(
      req.method,
      req.path,
      0,
      0,
      {
        requestId,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        query: req.query,
        body: req.method !== 'GET' ? req.body : undefined
      }
    );
    
    // Override res.end para capturar response
    const originalEnd = res.end;
    res.end = function(...args: any[]) {
      const duration = Date.now() - start;
      
      globalLogger.api(
        req.method,
        req.path,
        res.statusCode,
        duration,
        {
          requestId,
          responseSize: res.get('Content-Length')
        }
      );
      
      originalEnd.apply(res, args);
    };
    
    next();
  };
}