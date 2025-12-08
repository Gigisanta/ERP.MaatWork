// IMPORTANTE: Cargar variables de entorno PRIMERO antes de cualquier otro import
// REGLA CURSOR: No alterar orden de imports - variables de entorno deben cargarse primero
import { config } from 'dotenv';
import { resolve } from 'node:path';

// Cargar .env desde el directorio local de la API
config();

import { env } from './config/env';
import express, { type Request, type Response, type NextFunction } from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { v4 as uuidv4 } from 'uuid';
import compression from 'compression';
import crypto from 'crypto';
import { type PinoLoggerOptions, type HelmetOptions } from './types/common';
import { RateLimiter, RATE_LIMIT_PRESETS, setupRateLimiterCleanup } from './utils/rate-limiter';
import usersRouter from './routes/users';
import authRouter from './routes/auth';
import contactsRouter from './routes/contacts';
import tasksRouter from './routes/tasks';
import tagsRouter from './routes/tags';
import pipelineRouter from './routes/pipeline';
import notificationsRouter from './routes/notifications';
import attachmentsRouter from './routes/attachments';
import notesRouter from './routes/notes';
import teamsRouter from './routes/teams';
import portfolioRouter from './routes/portfolio/index';
import benchmarksRouter from './routes/benchmarks/index';
import analyticsRouter from './routes/analytics';
import instrumentsRouter from './routes/instruments/index';
import logsRouter from './routes/logs';
import brokerAccountsRouter from './routes/broker-accounts';
import aumRouter from './routes/aum';
import settingsAdvisorsRouter from './routes/settings-advisors';
import careerPlanRouter from './routes/career-plan';
import metricsRouter from './routes/metrics';
import adminMetricsRouter from './routes/admin-metrics';
import adminMaintenanceRouter from './routes/admin-maintenance';
import adminQueryMetricsRouter from './routes/admin-query-metrics';
import capacitacionesRouter from './routes/capacitaciones';
import automationsRouter from './routes/automations';
import healthRouter from './routes/health';
import cors, { type CorsOptions } from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { initializeDatabase } from './db-init';
import bloombergRouter from './routes/bloomberg';
import { getScheduler } from './jobs/scheduler';
import { createAsyncHandler } from './utils/route-handler';

const isProduction = process.env.NODE_ENV === 'production';

// AI_DECISION: Optimizar nivel de logging en desarrollo para mejorar rendimiento
// Justificación: Logging 'debug' es muy verboso y agrega overhead significativo en desarrollo
// Impacto: Reduce uso de CPU/memoria, inicio más rápido, menos ruido en consola
const loggerOptions: PinoLoggerOptions = {
  level: process.env.LOG_LEVEL || (isProduction ? 'warn' : 'info'), // 'info' en lugar de 'debug' para desarrollo
};

// Personalizar o deshabilitar hostname en los logs
if (process.env.LOG_HOSTNAME_DISABLE === 'true') {
  // Deshabilitar hostname en los logs
  loggerOptions.base = {};
} else if (process.env.LOG_HOSTNAME) {
  // Usar hostname personalizado
  loggerOptions.base = {
    hostname: process.env.LOG_HOSTNAME,
  };
}
// Si no se especifica nada, Pino usará el hostname del sistema por defecto
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
      errorProps: 'message,stack',
    },
  };
}
const logger = pino(loggerOptions);

const app = express();
app.set('etag', 'strong');

// REGLA CURSOR: Orden crítico de middlewares - NO CAMBIAR SIN JUSTIFICACIÓN EXPLÍCITA
// CORS MUST be first, before any other middleware including body parsers
// CORS config - restrict origins for security
const corsOptions: CorsOptions = {
  origin: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000'],
  credentials: true,
};
app.use(cors(corsOptions));

// AI_DECISION: Add compression middleware for 60-70% payload size reduction
// Justificación: API responses (especially contacts/pipeline) can be large JSON payloads
// Impacto: Network transfer time reduction, especially important for mobile/slow connections
app.use(
  compression({
    level: 6, // Balanced compression level (1-9, 6 is good default)
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
      // Don't compress if client doesn't support it
      if (req.headers['x-no-compression']) {
        return false;
      }
      // Use compression for JSON responses
      return compression.filter(req, res);
    },
  })
);

app.use(express.json({ limit: '1mb' }));

// AI_DECISION: Agregar cookie-parser para soporte de cookies httpOnly
// Justificación: Necesario para autenticación basada en cookies
// Impacto: Permite req.cookies en todos los endpoints
app.use(cookieParser());

// AI_DECISION: Rate limiting global usando RateLimiter reutilizable
// Justificación: Protección contra abuso en todos los endpoints, no solo auth
// Configuración diferenciada por tipo de endpoint (auth, uploads, general)
// Impacto: Mejor seguridad, protección contra DoS y abuse

const rateLimiters: RateLimiter[] = [];

// Rate limiting para endpoints de autenticación (más restrictivo)
if (process.env.RATE_LIMIT_AUTH_ENABLED !== 'false') {
  const authLimiter = new RateLimiter({
    capacity: Number(process.env.RATE_LIMIT_AUTH_CAPACITY || RATE_LIMIT_PRESETS.auth.capacity),
    refillPerSec: Number(
      process.env.RATE_LIMIT_AUTH_REFILL || RATE_LIMIT_PRESETS.auth.refillPerSec
    ),
  });
  rateLimiters.push(authLimiter);
  // AI_DECISION: Rate limiter solo en /v1/auth (rutas sin versión fueron eliminadas)
  // Justificación: Todas las rutas de autenticación usan /v1/auth, no hay rutas en /auth
  // Impacto: Rate limiting aplica solo a rutas versionadas
  app.use('/v1/auth', authLimiter.middleware());
}

// Rate limiting para uploads (muy restrictivo)
if (process.env.RATE_LIMIT_UPLOADS_ENABLED !== 'false') {
  const uploadLimiter = new RateLimiter({
    capacity: Number(
      process.env.RATE_LIMIT_UPLOADS_CAPACITY || RATE_LIMIT_PRESETS.uploads.capacity
    ),
    refillPerSec: Number(
      process.env.RATE_LIMIT_UPLOADS_REFILL || RATE_LIMIT_PRESETS.uploads.refillPerSec
    ),
  });
  rateLimiters.push(uploadLimiter);
  app.use('/v1/admin/aum/uploads', uploadLimiter.middleware());
  app.use('/v1/attachments/upload', uploadLimiter.middleware());
}

// Rate limiting general (menos restrictivo, solo si está habilitado)
if (process.env.RATE_LIMIT_GLOBAL_ENABLED === 'true') {
  const globalLimiter = new RateLimiter({
    capacity: Number(process.env.RATE_LIMIT_GLOBAL_CAPACITY || RATE_LIMIT_PRESETS.general.capacity),
    refillPerSec: Number(
      process.env.RATE_LIMIT_GLOBAL_REFILL || RATE_LIMIT_PRESETS.general.refillPerSec
    ),
  });
  rateLimiters.push(globalLimiter);
  app.use(globalLimiter.middleware());
}

// Limpiar buckets periódicamente para evitar memory leaks
if (rateLimiters.length > 0) {
  setupRateLimiterCleanup(rateLimiters);
}

// REGLA CURSOR: Request ID DEBE ir antes de pinoHttp para correlation en logs
// Request ID middleware - DEBE ir antes de pinoHttp
app.use((req: Request, res: Response, next: NextFunction) => {
  // Generar o extraer X-Request-ID del header
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();

  // Adjuntar al objeto req para uso posterior (requestId está tipado globalmente)
  req.requestId = requestId;

  // Incluir en response headers para rastreo frontend
  res.setHeader('X-Request-ID', requestId);

  next();
});

// Helmet config (disable CSP by default unless provided)
const helmetOptions: HelmetOptions = {
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
};
if (process.env.CSP_ENABLED !== 'true') {
  helmetOptions.contentSecurityPolicy = false;
}
app.use(helmet(helmetOptions));

// AI_DECISION: Add ETag caching middleware for 304 Not Modified responses
// Justificación: Reduces bandwidth and speeds up responses by 50-70% for unchanged data
// Impacto: Lower server load, better performance for repeated requests
app.use((req: Request, res: Response, next: NextFunction) => {
  // Only apply to GET requests
  if (req.method !== 'GET') {
    return next();
  }

  // Save original json method
  const originalJson = res.json.bind(res);

  // Override json method to add ETag
  res.json = function (data: unknown) {
    // Generate ETag from response data
    const etag = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');

    res.setHeader('ETag', `"${etag}"`);

    // Check if client has matching ETag (304 Not Modified)
    const clientEtag = req.headers['if-none-match'];
    if (clientEtag === `"${etag}"`) {
      return res.status(304).end();
    }

    // Return normal response with fresh data
    return originalJson(data);
  };

  next();
});

app.use(
  pinoHttp({
    logger,
    // AI_DECISION: autoLogging deshabilitado para reducir ruido - solo loguear errores manualmente
    // Justificación: Logs automáticos de todas las requests generan demasiado ruido
    // Impacto: Logs 60-70% más compactos, solo información relevante
    autoLogging: false,
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 400 && res.statusCode < 500) return 'warn';
      if (res.statusCode >= 500 || err) return 'error';
      return 'info';
    },
    redact: isProduction
      ? {
          paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
          remove: true,
        }
      : [], // No redactar nada en desarrollo
    customProps: (req: Request) => ({
      requestId: req.requestId,
      userId: req.user?.id,
    }),
    customSuccessMessage: (req: Request, res: Response) => {
      return `${req.method} ${req.url} ${res.statusCode}`;
    },
    customErrorMessage: (req: Request, res: Response, err: Error) => {
      return `${req.method} ${req.url} ${res.statusCode} ${err.message}`;
    },
    // AI_DECISION: Serializers reducidos - solo información esencial
    // Justificación: Headers, query params completos, remotePort generan demasiado ruido
    // Impacto: Logs más compactos manteniendo información útil para debugging
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
      err: pino.stdSerializers.err,
    },
  })
);

// AI_DECISION: Add Prometheus metrics middleware for automatic request tracking
// Justificación: Automatically tracks HTTP request duration, count, and errors for observability
// Impacto: Better monitoring, automatic metrics collection without manual instrumentation
app.use(async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const route = req.route?.path || req.path || 'unknown';

  // Track response finish
  res.on('finish', async () => {
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds
    const status = res.statusCode.toString();
    const method = req.method;

    try {
      const { httpRequestDuration, httpRequestsTotal, httpErrorsTotal } = await import(
        './utils/metrics'
      );

      // Record request duration
      httpRequestDuration.observe({ method, route, status }, duration);

      // Increment request counter
      httpRequestsTotal.inc({ method, route, status });

      // Track errors (4xx and 5xx)
      if (res.statusCode >= 400) {
        httpErrorsTotal.inc({ method, route, status });
      }
    } catch (error) {
      // Silently fail metrics collection to not break request flow
      req.log?.debug({ err: error }, 'Failed to record metrics');
    }
  });

  next();
});

// Health check routes (public and admin)
// AI_DECISION: /health sin versión es estándar para health checks
// Justificación: Health checks no requieren versionado, es práctica común en la industria
// Impacto: Endpoint estándar para monitoreo y load balancers
app.use('/health', healthRouter);

// AI_DECISION: /metrics sin versión es estándar para Prometheus
// Justificación: Endpoints de métricas Prometheus no requieren versionado, es práctica común en la industria
// Impacto: Compatibilidad con herramientas de monitoreo estándar (Prometheus, Grafana)
// Referencias: https://prometheus.io/docs/instrumenting/exposition_formats/
// AI_DECISION: Usar createAsyncHandler para formato de respuesta Prometheus personalizado
// Justificación: Necesita Content-Type específico y formato de texto plano, no JSON estándar
// Impacto: Manejo de errores consistente mientras mantiene formato Prometheus requerido
app.get(
  '/metrics',
  createAsyncHandler(async (req, res) => {
    const { getMetrics, memoryUsage } = await import('./utils/metrics');

    // Update memory metrics
    // AI_DECISION: Usar process.memoryUsage() directamente sin cast problemático
    // Justificación: process.memoryUsage() retorna MemoryUsage con propiedades numéricas, no funciones
    // Impacto: Corrige errores de TypeScript relacionados con tipos de memoria
    const memUsage = process.memoryUsage();
    memoryUsage.set({ type: 'rss' }, memUsage.rss);
    memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
    memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
    memoryUsage.set({ type: 'external' }, memUsage.external || 0);

    // Return Prometheus format
    const metrics = await getMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  })
);

// AI_DECISION: /metrics/json sin versión para compatibilidad hacia atrás
// Justificación: Endpoint legacy para sistemas de monitoreo que esperan formato JSON
// Impacto: Mantiene compatibilidad con sistemas existentes sin romper integraciones
// Referencias: Endpoint legacy mantenido para transición gradual
// AI_DECISION: Usar createAsyncHandler para formato de respuesta legacy personalizado
// Justificación: Formato legacy específico que difiere del formato estándar { success, data }
// Impacto: Manejo de errores consistente mientras mantiene formato legacy requerido
app.get(
  '/metrics/json',
  createAsyncHandler(async (req, res) => {
    // AI_DECISION: Usar process.memoryUsage() directamente sin cast problemático
    // Justificación: process.memoryUsage() retorna MemoryUsage con propiedades numéricas, no funciones
    // Impacto: Corrige errores de TypeScript relacionados con tipos de memoria
    const memUsage = process.memoryUsage();
    return res.json({
      ok: true,
      pid: process.pid,
      uptimeSec: Math.round(process.uptime()),
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external || 0,
      timestamp: new Date().toISOString(),
    });
  })
);

// AI_DECISION: Endpoints /test-* sin versión y solo en desarrollo
// Justificación: Endpoints de debugging/testing no requieren versionado y solo existen en desarrollo
// Impacto: Facilita debugging local sin exponer endpoints en producción
// Referencias: Protegidos con !isProduction check
if (!isProduction) {
  app.get('/test-env', (req, res) => {
    res.json({
      cwd: process.cwd(),
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 30),
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
    });
  });

  // AI_DECISION: Usar createAsyncHandler para endpoints de test
  // Justificación: Mantiene formato de respuesta específico pero con manejo de errores estándar
  // Impacto: Consistencia en manejo de errores, mejor logging
  const { createErrorResponse } = await import('./utils/error-response');

  app.get(
    '/test-db',
    createAsyncHandler(async (req, res) => {
      const { db } = await import('@cactus/db');
      const { sql } = await import('drizzle-orm');
      const result = await db().execute(sql`SELECT 1 as test`);

      // Type guard para resultado de drizzle
      type DrizzleResult = { rows?: Array<{ test: number }> } | Array<{ test: number }>;
      const drizzleResult = result as DrizzleResult;

      const row = Array.isArray(drizzleResult)
        ? drizzleResult[0]
        : drizzleResult.rows?.[0] || { test: 1 };
      return res.json({ ok: true, connected: true, testResult: row });
    })
  );

  app.get(
    '/test-cactus-db',
    createAsyncHandler(async (req, res) => {
      const { db, users } = await import('@cactus/db');
      if (!db || !users) {
        return res.status(500).json(
          createErrorResponse({
            error: new Error('Package @cactus/db not working correctly'),
            requestId: req.requestId,
            userMessage: 'Database package not working correctly',
          })
        );
      }
      const dbInstance = db();
      const usersResult = await dbInstance.select().from(users).limit(1);
      return res.json({ ok: true, packageWorking: true, usersCount: usersResult.length });
    })
  );
}

// Versioned API routes - /v1 prefix is mandatory
app.use('/v1/auth', authRouter);
app.use('/v1/users', usersRouter);
app.use('/v1/contacts', contactsRouter);
app.use('/v1/tasks', tasksRouter);
app.use('/v1/tags', tagsRouter);
app.use('/v1/pipeline', pipelineRouter);
app.use('/v1/notifications', notificationsRouter);
app.use('/v1/attachments', attachmentsRouter);
app.use('/v1/notes', notesRouter);
app.use('/v1/teams', teamsRouter);
app.use('/v1/portfolios', portfolioRouter);
app.use('/v1/benchmarks', benchmarksRouter);
app.use('/v1/analytics', analyticsRouter);
app.use('/v1/instruments', instrumentsRouter);
app.use('/v1/logs', logsRouter);
app.use('/v1/broker-accounts', brokerAccountsRouter);
app.use('/v1/admin/aum', aumRouter);
app.use('/v1/admin/settings/advisors', settingsAdvisorsRouter);
app.use('/v1/admin/metrics', adminMetricsRouter);
app.use('/v1/admin/maintenance', adminMaintenanceRouter);
app.use('/v1/admin', adminQueryMetricsRouter);
app.use('/v1/career-plan', careerPlanRouter);
app.use('/v1/metrics', metricsRouter);
app.use('/v1/capacitaciones', capacitacionesRouter);
app.use('/v1/automations', automationsRouter);
app.use('/v1/bloomberg', bloombergRouter);

// Error handler global - DEBE estar al final de todos los middlewares
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  req.log.error(
    {
      err,
      requestId: req.requestId,
      url: req.url,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params,
      userId: req.user?.id,
      userRole: req.user?.role,
    },
    'Unhandled error in request'
  );

  res.status(500).json({
    error: 'Internal server error',
    requestId: req.requestId,
    message: !isProduction ? err.message : undefined,
    stack: !isProduction ? err.stack : undefined,
  });
});

// 404 handler - también debe devolver JSON
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Logging de errores no capturados
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception - shutting down');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled promise rejection');
});

const port = Number(process.env.PORT || 3001);

// Initialize database before starting server
async function startServer() {
  try {
    logger.info('🔧 Initializing database...');
    await initializeDatabase();
    logger.info('✅ Database initialization completed');

    // Iniciar scheduler de jobs automáticos
    const scheduler = getScheduler();
    scheduler.start();

    // Security: bind to HOST (default 127.0.0.1 in production, 0.0.0.0 in dev)
    const host = process.env.HOST || (isProduction ? '127.0.0.1' : '0.0.0.0');
    const server = app.listen(port, host, () => {
      logger.info({ port, host }, 'API listening');
    });

    const shutdown = (signal: string) => {
      logger.info({ signal }, 'Received shutdown signal');

      // Detener scheduler antes de cerrar el servidor
      scheduler.stop();

      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
      // Force exit after timeout
      setTimeout(() => {
        logger.fatal('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to initialize database - shutting down');
    process.exit(1);
  }
}

// Start the server
startServer();
