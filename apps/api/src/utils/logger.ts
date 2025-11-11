/**
 * Logger Singleton for Services
 * 
 * AI_DECISION: Logger singleton para servicios independientes de Express
 * Justificación: Servicios no tienen acceso a req.log, necesitan logger independiente
 * Impacto: Logging estructurado consistente en toda la aplicación
 */

import pino from 'pino';
import type { PinoLoggerOptions } from '../types/common';

const isProduction = process.env.NODE_ENV === 'production';

const loggerOptions: PinoLoggerOptions = {
  level: process.env.LOG_LEVEL || (isProduction ? 'warn' : 'debug')
};

// Personalizar hostname
if (process.env.LOG_HOSTNAME_DISABLE === 'true') {
  loggerOptions.base = {};
} else if (process.env.LOG_HOSTNAME) {
  loggerOptions.base = {
    hostname: process.env.LOG_HOSTNAME
  };
}

// Pretty printing en desarrollo - formato compacto
if (!isProduction) {
  loggerOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss.l',
      singleLine: true,
      ignore: 'pid,hostname',
      errorLikeObjectKeys: ['err', 'error'],
      messageFormat: '{levelLabel} {msg}',
      errorProps: 'message,stack'
    }
  };
}

/**
 * Logger singleton para servicios
 * Usar este logger en servicios que no tienen acceso a req.log
 */
export const logger = pino(loggerOptions);

