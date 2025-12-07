import { Router, type Request } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { validate } from '../utils/validation';
import { createRouteHandler, createAsyncHandler } from '../utils/route-handler';

const router = Router();

// Schema de validación para logs del cliente
const ClientLogSchema = z.object({
  timestamp: z.string(),
  level: z.enum(['debug', 'info', 'warn', 'error']),
  message: z.string(),
  context: z.record(z.unknown()).optional(),
  userAgent: z.string().optional(),
  url: z.string().optional(),
  requestId: z.string().optional(),
  userId: z.string().optional(),
  userRole: z.string().optional(),
  sessionId: z.string().optional(),
});

const BatchLogSchema = z.object({
  logs: z.array(ClientLogSchema).max(100), // Limitar batch a 100 logs
});

// Schema union para aceptar array directo, objeto con logs, o log individual
const LogsInputSchema = z.union([
  z.array(ClientLogSchema).max(100), // Array directo
  BatchLogSchema, // Objeto con propiedad logs
  ClientLogSchema, // Log individual
]);

/**
 * Sanitizar contexto de logs para remover datos sensibles
 */
function sanitizeLogContext(context: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'key',
    'auth',
    'authorization',
    'cookie',
    'session',
    'jwt',
    'bearer',
    'apiKey',
    'accessToken',
    'refreshToken',
    'creditCard',
    'ssn',
    'dni',
    'phone',
    'email',
  ];

  const sanitized = { ...context };

  function sanitizeValue(key: string, value: unknown): unknown {
    if (typeof value === 'string') {
      // Si la clave contiene palabras sensibles, redactar el valor
      const isSensitive = sensitiveKeys.some((sensitive) =>
        key.toLowerCase().includes(sensitive.toLowerCase())
      );

      if (isSensitive) {
        return '[REDACTED]';
      }

      // Redactar valores que parecen ser tokens o passwords
      if (value.length > 20 && /^[A-Za-z0-9+/=]+$/.test(value)) {
        return '[REDACTED_TOKEN]';
      }

      return value;
    }

    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.map((item, index) => sanitizeValue(`${key}[${index}]`, item));
      } else {
        const sanitizedObj: Record<string, unknown> = {};
        for (const [objKey, objValue] of Object.entries(value as Record<string, unknown>)) {
          sanitizedObj[objKey] = sanitizeValue(objKey, objValue);
        }
        return sanitizedObj;
      }
    }

    return value;
  }

  for (const [key, value] of Object.entries(sanitized)) {
    sanitized[key] = sanitizeValue(key, value);
  }

  return sanitized;
}

/**
 * POST /logs/client - Recibir logs del frontend
 * Endpoint para centralizar logs de cliente en el backend
 *
 * Acepta tres formatos:
 * 1. Array de logs directamente: [{ level: 'info', message: '...', ... }, ...]
 * 2. Objeto con propiedad logs: { logs: [{ level: 'info', message: '...', ... }] }
 * 3. Log individual: { level: 'info', message: '...', ... }
 */
router.post(
  '/client',
  validate({ body: LogsInputSchema }),
  createAsyncHandler(async (req: Request, res) => {
    const startTime = Date.now();

    req.log.info(
      {
        action: 'receive_client_logs',
        bodySize: JSON.stringify(req.body).length,
        contentType: req.get('Content-Type'),
      },
      'Recibiendo logs del frontend'
    );

    type LogEntryToProcess = {
      id: string;
      message: string;
      context: Record<string, unknown>;
      level: string;
      userId: string | null;
      userRole: string | null;
      createdAt: Date;
    };

    let logsToProcess: LogEntryToProcess[];
    const validated = req.body as z.infer<typeof LogsInputSchema>;

    if (Array.isArray(validated)) {
      // Batch de logs (array directo)
      logsToProcess = validated.map((log) => ({
        id: crypto.randomUUID(),
        message: log.message,
        context: log.context || {},
        level: log.level,
        userId: log.userId || null,
        userRole: log.userRole || null,
        createdAt: new Date(log.timestamp),
      }));
    } else if ('logs' in validated && Array.isArray(validated.logs)) {
      // Batch con wrapper
      logsToProcess = validated.logs.map((log) => ({
        id: crypto.randomUUID(),
        message: log.message,
        context: log.context || {},
        level: log.level,
        userId: log.userId || null,
        userRole: log.userRole || null,
        createdAt: new Date(log.timestamp),
      }));
    } else {
      // Log individual
      logsToProcess = [
        {
          id: crypto.randomUUID(),
          message: validated.message,
          context: validated.context || {},
          level: validated.level,
          userId: validated.userId || null,
          userRole: validated.userRole || null,
          createdAt: new Date(validated.timestamp),
        },
      ];
    }

    // Procesar cada log
    for (const logEntry of logsToProcess) {
      // Sanitizar datos sensibles
      const sanitizedContext = sanitizeLogContext(logEntry.context || {});

      // Crear entrada de log estructurada
      const logData = {
        ...logEntry,
        context: sanitizedContext,
        source: 'client',
        receivedAt: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || req.requestId,
      };

      // Loggear usando el logger del servidor
      switch (logEntry.level) {
        case 'debug':
          req.log.debug(logData, `[CLIENT] ${logEntry.message}`);
          break;
        case 'info':
          req.log.info(logData, `[CLIENT] ${logEntry.message}`);
          break;
        case 'warn':
          req.log.warn(logData, `[CLIENT] ${logEntry.message}`);
          break;
        case 'error':
          req.log.error(logData, `[CLIENT] ${logEntry.message}`);
          break;
      }
    }

    const duration = Date.now() - startTime;
    req.log.info(
      {
        duration,
        processedLogs: logsToProcess.length,
        action: 'receive_client_logs',
      },
      'Logs del frontend procesados exitosamente'
    );

    return res.json({
      success: true,
      processed: logsToProcess.length,
      duration,
      requestId: req.requestId,
    });
  })
);

/**
 * GET /logs/health - Health check para el servicio de logs
 */
router.get(
  '/health',
  createRouteHandler(async (req: Request) => {
    req.log.info({ action: 'logs_health_check' }, 'Health check del servicio de logs');

    return {
      service: 'logs',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  })
);

export default router;
