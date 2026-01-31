/**
 * Server-Side Logger for Next.js (Edge & Node.js compatible)
 *
 * Designed to provide structured logging in Server Components and Middleware.
 * Outputs JSON in production for easier parsing by log aggregators.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  msg: string;
  time: number;
  timestamp: string;
  [key: string]: unknown;
}

const isProduction = process.env.NODE_ENV === 'production';

// AI_DECISION: Use a custom logger compatible with Edge Runtime
// Justificación: 'pino' and other libraries might have Node.js specific dependencies.
//                This lightweight implementation works everywhere (Edge, Node, Browser).
class ServerLogger {
  private log(level: LogLevel, message: string, context: Record<string, unknown> = {}) {
    // In production, suppress debug logs unless explicitly enabled
    if (isProduction && level === 'debug' && process.env.NEXT_PUBLIC_DEBUG !== 'true') {
      return;
    }

    const timestamp = new Date().toISOString();

    if (isProduction) {
      // JSON logging for production (PM2 compatible)
      const entry: LogEntry = {
        level,
        time: Date.now(), // Unix timestamp for easier sorting
        timestamp,
        msg: message,
        ...context,
      };
      // Use console methods directly as they are captured by PM2/Docker
      console[level === 'error' ? 'error' : 'log'](JSON.stringify(entry));
    } else {
      // Pretty printing for development
      const prefix = `${timestamp} [${level.toUpperCase()}]`;
      const args = [prefix, message];

      if (Object.keys(context).length > 0) {
        args.push('\n', JSON.stringify(context, null, 2));
      }

      console[level === 'error' ? 'error' : 'log'](...args);
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>) {
    this.log('error', message, context);
  }
}

export const logger = new ServerLogger();
