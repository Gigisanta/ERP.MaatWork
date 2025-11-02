import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';

const router = Router();

// Schema de validación para logs del cliente
const ClientLogSchema = z.object({
  timestamp: z.string(),
  level: z.enum(['debug', 'info', 'warn', 'error']),
  message: z.string(),
  context: z.record(z.any()).optional(),
  userAgent: z.string().optional(),
  url: z.string().optional(),
  requestId: z.string().optional(),
  userId: z.string().optional(),
  userRole: z.string().optional(),
  sessionId: z.string().optional()
});

const BatchLogSchema = z.object({
  logs: z.array(ClientLogSchema).max(100) // Limitar batch a 100 logs
});

/**
 * POST /logs/client - Recibir logs del frontend
 * Endpoint para centralizar logs de cliente en el backend
 */
router.post('/client', async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  req.log.info({ 
    action: 'receive_client_logs',
    bodySize: JSON.stringify(req.body).length,
    contentType: req.get('Content-Type')
  }, 'Recibiendo logs del frontend');

  try {
    // Validar si es un batch de logs o un log individual
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
    
    if (Array.isArray(req.body)) {
      // Batch de logs
      const validated = BatchLogSchema.parse({ logs: req.body });
      logsToProcess = validated.logs;
    } else if (req.body.logs && Array.isArray(req.body.logs)) {
      // Batch con wrapper
      const validated = BatchLogSchema.parse(req.body);
      logsToProcess = validated.logs;
    } else {
      // Log individual
      const validated = ClientLogSchema.parse(req.body);
      logsToProcess = [validated];
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
        requestId: req.headers['x-request-id'] || req.requestId
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
    req.log.info({ 
      duration,
      processedLogs: logsToProcess.length,
      action: 'receive_client_logs'
    }, 'Logs del frontend procesados exitosamente');

    res.json({ 
      success: true, 
      processed: logsToProcess.length,
      duration 
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error instanceof z.ZodError) {
      req.log.warn({ 
        err: error.errors, 
        duration,
        action: 'receive_client_logs',
        validationError: true
      }, 'Error de validación en logs del cliente');
      
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors,
        processed: 0
      });
    }

    req.log.error({ 
      err: error, 
      duration,
      action: 'receive_client_logs'
    }, 'Error procesando logs del cliente');
    
    next(error);
  }
});

/**
 * GET /logs/health - Health check para el servicio de logs
 */
router.get('/health', (req: Request, res: Response) => {
  req.log.info({ action: 'logs_health_check' }, 'Health check del servicio de logs');
  
  res.json({ 
    service: 'logs',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

/**
 * Sanitizar contexto de logs para remover datos sensibles
 */
function sanitizeLogContext(context: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'auth', 'authorization',
    'cookie', 'session', 'jwt', 'bearer', 'apiKey', 'accessToken',
    'refreshToken', 'creditCard', 'ssn', 'dni', 'phone', 'email'
  ];

  const sanitized = { ...context };

  function sanitizeValue(key: string, value: unknown): unknown {
    if (typeof value === 'string') {
      // Si la clave contiene palabras sensibles, redactar el valor
      const isSensitive = sensitiveKeys.some(sensitive => 
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

export default router;
