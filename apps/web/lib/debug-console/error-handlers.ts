/**
 * Manejadores de errores para Debug Console
 * Captura errores de JavaScript, promesas rechazadas y console.error/warn
 */

import type { ErrorLog } from './types';
import { isNextRedirectError } from './utils';

type LogCallback = (log: Partial<ErrorLog>) => void;

/**
 * Configura el handler para errores de JavaScript
 */
function setupErrorHandler(logCallback: LogCallback): void {
  window.addEventListener('error', (event) => {
    // Filtrar errores NEXT_REDIRECT que son normales en Next.js Server Components
    if (event.message === 'NEXT_REDIRECT' || event.error?.message === 'NEXT_REDIRECT') {
      return;
    }

    logCallback({
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
}

/**
 * Configura el handler para promesas rechazadas sin catch
 */
function setupUnhandledRejectionHandler(logCallback: LogCallback): void {
  window.addEventListener('unhandledrejection', (event) => {
    const reasonMessage = event.reason?.message || String(event.reason);
    if (isNextRedirectError(reasonMessage)) {
      return;
    }

    logCallback({
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
}

/**
 * Intercepta console.error para capturar errores
 */
function setupConsoleErrorInterceptor(logCallback: LogCallback, isLogging: () => boolean): void {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    originalError.apply(console, args);

    if (isLogging()) return;

    const message = args.map((arg) => String(arg)).join(' ');
    if (message.includes('[Logger]') || message.includes('Failed to send log to backend')) {
      return;
    }

    if (isNextRedirectError(message)) {
      return;
    }

    const errorArg = args.find((arg) => arg instanceof Error) as Error | undefined;
    if (errorArg?.message === 'NEXT_REDIRECT') {
      return;
    }

    logCallback({
      type: 'error',
      message: args
        .map((arg) => {
          if (arg instanceof Error) {
            return arg.message;
          }
          return String(arg);
        })
        .join(' '),
      ...(errorArg?.stack && { stack: errorArg.stack }),
      url: window.location.href,
      details: {
        args: args.map((arg) => {
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
}

/**
 * Intercepta console.warn para capturar warnings
 */
function setupConsoleWarnInterceptor(logCallback: LogCallback, isLogging: () => boolean): void {
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    originalWarn.apply(console, args);

    if (isLogging()) return;

    const message = args.map((arg) => String(arg)).join(' ');
    if (message.includes('[Logger]')) {
      return;
    }

    logCallback({
      type: 'warn',
      message: args.map((arg) => String(arg)).join(' '),
      url: window.location.href,
    });
  };
}

/**
 * Configura todos los handlers de errores
 */
export function setupAllErrorHandlers(logCallback: LogCallback, isLogging: () => boolean): void {
  setupErrorHandler(logCallback);
  setupUnhandledRejectionHandler(logCallback);
  setupConsoleErrorInterceptor(logCallback, isLogging);
  setupConsoleWarnInterceptor(logCallback, isLogging);
}
