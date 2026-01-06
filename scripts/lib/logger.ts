/**
 * Logger - Utilidad centralizada de logging para scripts
 *
 * Proporciona output consistente con colores y prefijos estandarizados.
 * Reemplaza el uso directo de chalk en cada script.
 *
 * @example
 * import { logger } from './lib/logger';
 * logger.info('Starting process...');
 * logger.success('Done!');
 * logger.error('Something failed', error);
 */

import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error';

interface LoggerOptions {
  /** Prefijo para todos los mensajes */
  prefix?: string;
  /** Mostrar timestamps */
  timestamps?: boolean;
  /** Nivel mínimo de logs a mostrar */
  minLevel?: LogLevel;
  /** Modo silencioso (solo errores) */
  silent?: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  success: 2,
  warn: 3,
  error: 4,
};

const LEVEL_STYLES: Record<LogLevel, { color: typeof chalk.blue; icon: string }> = {
  debug: { color: chalk.gray, icon: '🔍' },
  info: { color: chalk.blue, icon: 'ℹ️' },
  success: { color: chalk.green, icon: '✅' },
  warn: { color: chalk.yellow, icon: '⚠️' },
  error: { color: chalk.red, icon: '❌' },
};

class Logger {
  private options: Required<LoggerOptions>;

  constructor(options: LoggerOptions = {}) {
    this.options = {
      prefix: options.prefix ?? '',
      timestamps: options.timestamps ?? false,
      minLevel: options.minLevel ?? 'info',
      silent: options.silent ?? (process.env.CI === 'true' && process.env.VERBOSE !== 'true'),
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.options.silent && level !== 'error') {
      return false;
    }
    return LOG_LEVELS[level] >= LOG_LEVELS[this.options.minLevel];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const { color, icon } = LEVEL_STYLES[level];
    const parts: string[] = [];

    if (this.options.timestamps) {
      parts.push(chalk.dim(`[${new Date().toISOString()}]`));
    }

    if (this.options.prefix) {
      parts.push(chalk.cyan(`[${this.options.prefix}]`));
    }

    parts.push(`${icon} ${color(message)}`);

    return parts.join(' ');
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message), ...args);
    }
  }

  success(message: string, ...args: unknown[]): void {
    if (this.shouldLog('success')) {
      console.log(this.formatMessage('success', message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  error(message: string, error?: unknown): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message));
      if (error instanceof Error) {
        console.error(chalk.red(`   ${error.message}`));
        if (process.env.DEBUG === 'true' && error.stack) {
          console.error(chalk.dim(error.stack));
        }
      } else if (error !== undefined) {
        console.error(chalk.red(`   ${String(error)}`));
      }
    }
  }

  /** Log sin formato (output directo) */
  raw(message: string): void {
    console.log(message);
  }

  /** Línea en blanco */
  newline(): void {
    console.log('');
  }

  /** Separador visual */
  separator(char = '─', length = 60): void {
    console.log(chalk.dim(char.repeat(length)));
  }

  /** Header con estilo */
  header(title: string): void {
    this.newline();
    console.log(chalk.bold.cyan(`${'═'.repeat(60)}`));
    console.log(chalk.bold.cyan(`  ${title}`));
    console.log(chalk.bold.cyan(`${'═'.repeat(60)}`));
    this.newline();
  }

  /** Subheader */
  subheader(title: string): void {
    this.newline();
    console.log(chalk.bold(`▸ ${title}`));
    this.separator();
  }

  /** Lista con bullets */
  list(items: string[], indent = 2): void {
    const spaces = ' '.repeat(indent);
    items.forEach((item) => {
      console.log(`${spaces}• ${item}`);
    });
  }

  /** Tabla simple clave-valor */
  keyValue(data: Record<string, string | number | boolean>, indent = 2): void {
    const spaces = ' '.repeat(indent);
    const maxKeyLength = Math.max(...Object.keys(data).map((k) => k.length));

    Object.entries(data).forEach(([key, value]) => {
      const paddedKey = key.padEnd(maxKeyLength);
      console.log(`${spaces}${chalk.dim(paddedKey)}  ${value}`);
    });
  }

  /** Paso numerado */
  step(number: number, total: number, message: string): void {
    const stepInfo = chalk.dim(`[${number}/${total}]`);
    console.log(`${stepInfo} ${message}`);
  }

  /** Crear sub-logger con prefijo */
  child(prefix: string): Logger {
    return new Logger({
      ...this.options,
      prefix: this.options.prefix ? `${this.options.prefix}:${prefix}` : prefix,
    });
  }
}

/** Logger por defecto */
export const logger = new Logger();

/** Crear logger con opciones personalizadas */
export function createLogger(options: LoggerOptions): Logger {
  return new Logger(options);
}

/** Utilidades de color exportadas para uso directo */
export const colors = {
  primary: chalk.cyan,
  secondary: chalk.blue,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  muted: chalk.dim,
  bold: chalk.bold,
  underline: chalk.underline,
};

