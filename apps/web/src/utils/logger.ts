// Sistema de logging centralizado para monitoreo de errores
// Proporciona logging estructurado con diferentes niveles y contexto

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  error?: Error;
  userId?: string;
  sessionId?: string;
}

export interface LoggerConfig {
  enableConsole: boolean;
  enableStorage: boolean;
  maxStorageEntries: number;
  logLevel: LogLevel;
}

class Logger {
  private config: LoggerConfig;
  private sessionId: string;
  private logEntries: LogEntry[] = [];

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      enableConsole: true,
      enableStorage: true,
      maxStorageEntries: 1000,
      logLevel: 'info',
      ...config
    };
    
    this.sessionId = this.generateSessionId();
    this.loadStoredLogs();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const context = entry.context ? `[${entry.context}]` : '';
    return `${timestamp} [${entry.level.toUpperCase()}] ${context} ${entry.message}`;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    data?: any,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
      error,
      sessionId: this.sessionId,
      userId: this.getCurrentUserId()
    };
  }

  private getCurrentUserId(): string | undefined {
    try {
      // Intentar obtener el ID del usuario desde el store o localStorage
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.id || user.email;
      }
    } catch (error) {
      // Silenciosamente fallar si no se puede obtener el usuario
    }
    return undefined;
  }

  private log(level: LogLevel, message: string, context?: string, data?: any, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, message, context, data, error);
    
    // Console logging
    if (this.config.enableConsole) {
      const formattedMessage = this.formatMessage(entry);
      
      switch (level) {
        case 'debug':
          console.debug(formattedMessage, data);
          break;
        case 'info':
          console.info(formattedMessage, data);
          break;
        case 'warn':
          console.warn(formattedMessage, data);
          break;
        case 'error':
          console.error(formattedMessage, error || data);
          break;
      }
    }

    // Storage logging
    if (this.config.enableStorage) {
      this.logEntries.push(entry);
      
      // Mantener solo las últimas entradas
      if (this.logEntries.length > this.config.maxStorageEntries) {
        this.logEntries = this.logEntries.slice(-this.config.maxStorageEntries);
      }
      
      this.saveLogsToStorage();
    }
  }

  private loadStoredLogs(): void {
    try {
      const stored = localStorage.getItem('app_logs');
      if (stored) {
        this.logEntries = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load stored logs:', error);
    }
  }

  private saveLogsToStorage(): void {
    try {
      localStorage.setItem('app_logs', JSON.stringify(this.logEntries));
    } catch (error) {
      console.warn('Failed to save logs to storage:', error);
    }
  }

  // Métodos públicos de logging
  debug(message: string, context?: string, data?: any): void {
    this.log('debug', message, context, data);
  }

  info(message: string, context?: string, data?: any): void {
    this.log('info', message, context, data);
  }

  warn(message: string, context?: string, data?: any): void {
    this.log('warn', message, context, data);
  }

  error(message: string, context?: string, error?: Error, data?: any): void {
    this.log('error', message, context, data, error);
  }

  // Métodos específicos para el sistema de etiquetas
  tagOperation(operation: string, tagData?: any, result?: any): void {
    this.info(`Tag operation: ${operation}`, 'TAGS', { tagData, result });
  }

  tagError(operation: string, error: Error, tagData?: any): void {
    this.error(`Tag operation failed: ${operation}`, 'TAGS', error, { tagData });
  }

  contactOperation(operation: string, contactId?: string, data?: any): void {
    this.info(`Contact operation: ${operation}`, 'CONTACTS', { contactId, data });
  }

  contactError(operation: string, error: Error, contactId?: string, data?: any): void {
    this.error(`Contact operation failed: ${operation}`, 'CONTACTS', error, { contactId, data });
  }

  supabaseOperation(operation: string, table?: string, data?: any): void {
    this.info(`Supabase operation: ${operation}`, 'SUPABASE', { table, data });
  }

  supabaseError(operation: string, error: Error, table?: string, data?: any): void {
    this.error(`Supabase operation failed: ${operation}`, 'SUPABASE', error, { table, data });
  }

  // Métodos de utilidad
  getLogs(level?: LogLevel, context?: string, limit?: number): LogEntry[] {
    let filtered = this.logEntries;
    
    if (level) {
      filtered = filtered.filter(entry => entry.level === level);
    }
    
    if (context) {
      filtered = filtered.filter(entry => entry.context === context);
    }
    
    if (limit) {
      filtered = filtered.slice(-limit);
    }
    
    return filtered;
  }

  clearLogs(): void {
    this.logEntries = [];
    localStorage.removeItem('app_logs');
  }

  exportLogs(): string {
    return JSON.stringify(this.logEntries, null, 2);
  }

  getLogStats(): { total: number; byLevel: Record<LogLevel, number>; byContext: Record<string, number> } {
    const stats = {
      total: this.logEntries.length,
      byLevel: { debug: 0, info: 0, warn: 0, error: 0 } as Record<LogLevel, number>,
      byContext: {} as Record<string, number>
    };

    this.logEntries.forEach(entry => {
      stats.byLevel[entry.level]++;
      if (entry.context) {
        stats.byContext[entry.context] = (stats.byContext[entry.context] || 0) + 1;
      }
    });

    return stats;
  }
}

// Instancia global del logger
export const logger = new Logger({
  enableConsole: process.env.NODE_ENV === 'development',
  enableStorage: true,
  maxStorageEntries: 1000,
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
});

// Funciones de conveniencia
export const logDebug = (message: string, context?: string, data?: any) => 
  logger.debug(message, context, data);

export const logInfo = (message: string, context?: string, data?: any) => 
  logger.info(message, context, data);

export const logWarn = (message: string, context?: string, data?: any) => 
  logger.warn(message, context, data);

export const logError = (message: string, context?: string, error?: Error, data?: any) => 
  logger.error(message, context, error, data);

// Funciones específicas para etiquetas
export const logTagOperation = (operation: string, tagData?: any, result?: any) => 
  logger.tagOperation(operation, tagData, result);

export const logTagError = (operation: string, error: Error, tagData?: any) => 
  logger.tagError(operation, error, tagData);

export const logContactOperation = (operation: string, contactId?: string, data?: any) => 
  logger.contactOperation(operation, contactId, data);

export const logContactError = (operation: string, error: Error, contactId?: string, data?: any) => 
  logger.contactError(operation, error, contactId, data);

export default logger;