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
import portfolioRouter from './routes/portfolio';
import benchmarksRouter from './routes/benchmarks';
import analyticsRouter from './routes/analytics';
import instrumentsRouter from './routes/instruments';
import logsRouter from './routes/logs';
import brokerAccountsRouter from './routes/broker-accounts';
import aumRouter from './routes/aum';
import cors, { type CorsOptions } from 'cors';
import helmet from 'helmet';
import { initializeDatabase } from './db-init';

const isProduction = process.env.NODE_ENV === 'production';

type PinoLoggerOptions = {
  level: string;
  transport?: {
    target: string;
    options: {
      colorize: boolean;
      translateTime: string;
      singleLine: boolean;
      ignore: string;
      errorLikeObjectKeys: string[];
      messageFormat: string;
      errorProps: string;
    };
  };
};

const loggerOptions: PinoLoggerOptions = {
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug')
};
if (!isProduction) {
  loggerOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l o',
      singleLine: false,
      ignore: '',
      errorLikeObjectKeys: ['err', 'error'],
      messageFormat: '{levelLabel} - {msg}',
      errorProps: '*'
    }
  };
}
const logger = pino(loggerOptions);

const app = express();
app.set('etag', 'strong');

// REGLA CURSOR: Orden crítico de middlewares - NO CAMBIAR SIN JUSTIFICACIÓN EXPLÍCITA
// CORS MUST be first, before any other middleware including body parsers
// CORS config - restrict origins for security
const corsOptions: CorsOptions = {
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
  credentials: true
};
app.use(cors(corsOptions));

// AI_DECISION: Add compression middleware for 60-70% payload size reduction
// Justificación: API responses (especially contacts/pipeline) can be large JSON payloads
// Impacto: Network transfer time reduction, especially important for mobile/slow connections
app.use(compression({
  level: 6, // Balanced compression level (1-9, 6 is good default)
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression for JSON responses
    return compression.filter(req, res);
  }
}));

app.use(express.json({ limit: '1mb' }));

// Optional rate limiting for /auth endpoints (simple token bucket, per-IP) behind flag
if (process.env.RATE_LIMIT_AUTH_ENABLED === 'true') {
  const buckets = new Map<string, { tokens: number; lastRefill: number }>();
  const capacity = Number(process.env.RATE_LIMIT_AUTH_CAPACITY || 60); // tokens
  const refillPerSec = Number(process.env.RATE_LIMIT_AUTH_REFILL || 30); // tokens per second
  const limiter = (req: Request, res: Response, next: NextFunction) => {
    const xf = req.headers['x-forwarded-for'];
    const forwarded = typeof xf === 'string' ? xf.split(',')[0]?.trim() : undefined;
    const ip = forwarded || req.ip || 'unknown';
    const now = Date.now() / 1000;
    const bucket = buckets.get(ip) || { tokens: capacity, lastRefill: now };
    // Refill
    const elapsed = now - bucket.lastRefill;
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerSec);
    bucket.lastRefill = now;
    // Cost 1 token
    if (bucket.tokens < 1) {
      return res.status(429).json({ error: 'Too Many Requests' });
    }
    bucket.tokens -= 1;
    buckets.set(ip, bucket);
    next();
  };
  app.use('/auth', limiter);
  app.use('/v1/auth', limiter);
}

// REGLA CURSOR: Request ID DEBE ir antes de pinoHttp para correlation en logs
// Request ID middleware - DEBE ir antes de pinoHttp
app.use((req: Request, res: Response, next: NextFunction) => {
  // Generar o extraer X-Request-ID del header
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  
  // Adjuntar al objeto req para uso posterior
  type RequestWithRequestId = Request & { requestId?: string };
  (req as RequestWithRequestId).requestId = requestId;
  
  // Incluir en response headers para rastreo frontend
  res.setHeader('X-Request-ID', requestId);
  
  next();
});

// Helmet config (disable CSP by default unless provided)
const helmetOptions: any = {
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false
};
if (process.env.CSP_ENABLED !== 'true') {
  helmetOptions.contentSecurityPolicy = false;
}
app.use(helmet(helmetOptions));

app.use(
  pinoHttp({
    logger,
    autoLogging: true,
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 400 && res.statusCode < 500) return 'warn';
      if (res.statusCode >= 500 || err) return 'error';
      return 'info';
    },
    redact: isProduction ? {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'],
      remove: true
    } : [],  // No redactar nada en desarrollo
    customProps: (req: Request) => ({
      requestId: (req as any).requestId,
      traceparent: req.headers['traceparent'],
      userId: (req as any).user?.id,
      userRole: (req as any).user?.role,
      teamId: (req as any).user?.teamId
    }),
    customSuccessMessage: (req: Request, res: Response) => {
      return `${req.method} ${req.url} - ${res.statusCode}`;
    },
    customErrorMessage: (req: Request, res: Response, err: Error) => {
      return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
    },
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        query: req.query,
        params: req.params,
        headers: req.headers,
        remoteAddress: req.remoteAddress,
        remotePort: req.remotePort
      }),
      res: (res) => ({
        statusCode: res.statusCode,
        headers: res.headers
      }),
      err: pino.stdSerializers.err
    }
  })
);

app.get('/health', (req, res) => {
  req.log.info({ route: '/health' }, 'healthcheck');
  res.json({ ok: true });
});

// Basic metrics endpoint (no sensitive info)
app.get('/metrics', (req, res) => {
  const memory = process.memoryUsage();
  res.json({
    ok: true,
    pid: process.pid,
    uptimeSec: Math.round(process.uptime()),
    rss: memory.rss,
    heapUsed: memory.heapUsed,
    external: (memory as any).external,
    timestamp: new Date().toISOString()
  });
});

if (!isProduction) {
  app.get('/test-env', (req, res) => {
    res.json({
      cwd: process.cwd(),
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 30),
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT
    });
  });

  app.get('/test-db', async (req, res) => {
    try {
      const { Pool } = await import('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const client = await pool.connect();
      const result = await client.query('SELECT 1 as test');
      client.release();
      await pool.end();
      res.json({ ok: true, connected: true, testResult: result.rows[0] });
    } catch (error) {
      req.log.error({ err: error }, 'Error en test-db');
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get('/test-cactus-db', async (req, res) => {
    try {
      const { db, users } = await import('@cactus/db');
      if (!db || !users) {
        return res.status(500).json({ error: 'Package @cactus/db not working correctly' });
      }
      const dbInstance = db();
      const usersResult = await dbInstance.select().from(users).limit(1);
      res.json({ ok: true, packageWorking: true, usersCount: usersResult.length });
    } catch (error) {
      req.log.error({ err: error }, 'Error en test-cactus-db');
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });
}

app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/contacts', contactsRouter);
app.use('/tasks', tasksRouter);
app.use('/tags', tagsRouter);
app.use('/pipeline', pipelineRouter);
app.use('/notifications', notificationsRouter);
app.use('/attachments', attachmentsRouter);
app.use('/notes', notesRouter);
app.use('/teams', teamsRouter);
app.use('/portfolios', portfolioRouter);
app.use('/benchmarks', benchmarksRouter);
app.use('/analytics', analyticsRouter);
app.use('/instruments', instrumentsRouter);
app.use('/logs', logsRouter);
app.use('/broker-accounts', brokerAccountsRouter);
app.use('/admin/aum', aumRouter);

// Optional versioned API prefix (/v1) for future breaking changes
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

// Error handler global - DEBE estar al final de todos los middlewares
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  req.log.error({
    err,
    requestId: (req as any).requestId,
    url: req.url,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    userId: (req as any).user?.id,
    userRole: (req as any).user?.role
  }, 'Unhandled error in request');
  
  res.status(500).json({
    error: 'Internal server error',
    requestId: (req as any).requestId,
    message: !isProduction ? err.message : undefined,
    stack: !isProduction ? err.stack : undefined
  });
});

// 404 handler - también debe devolver JSON
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
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
    
    const server = app.listen(port, () => {
      logger.info({ port }, 'API listening');
      // Schedulers removidos
    });

    const shutdown = (signal: string) => {
      logger.info({ signal }, 'Received shutdown signal');
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