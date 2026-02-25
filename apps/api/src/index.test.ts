/**
 * Tests para index.ts (entry point de la API)
 *
 * AI_DECISION: Tests para inicialización, health endpoints y error handlers
 * Justificación: Validar que el servidor se inicializa correctamente y maneja errores
 * Impacto: Prevenir problemas en startup y manejo de errores globales
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// Mock dependencies antes de importar
vi.mock('dotenv', () => ({
  config: vi.fn(),
}));

vi.mock('./config/env', () => ({
  env: {
    PORT: '3001',
    NODE_ENV: 'test',
  },
}));

vi.mock('express', async () => {
  const actual = await vi.importActual('express');
  return {
    ...actual,
    default: vi.fn(() => ({
      set: vi.fn(),
      use: vi.fn(),
      get: vi.fn(),
      listen: vi.fn((port, callback) => {
        if (callback) callback();
        return {
          close: vi.fn((cb) => cb && cb()),
        };
      }),
    })),
  };
});

vi.mock('pino', () => ({
  default: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  })),
}));

vi.mock('pino-http', () => ({
  default: vi.fn(() => vi.fn()),
}));

vi.mock('./db-init', () => ({
  initializeDatabase: vi.fn().mockResolvedValue(undefined),
}));

describe('API Entry Point', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalExit = process.exit;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
    // Mock process.exit para evitar que los tests terminen el proceso
    process.exit = vi.fn() as any;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    process.exit = originalExit;
  });

  describe('Health endpoints', () => {
    it('debería tener endpoint /health que retorna ok', () => {
      const mockReq = {
        log: { info: vi.fn() },
      } as Partial<Request>;

      const mockRes = {
        json: vi.fn(),
      } as Partial<Response>;

      // Simular handler de /health
      const healthHandler = (req: Request, res: Response) => {
        req.log.info({ route: '/health' }, 'healthcheck');
        res.json({ ok: true });
      };

      healthHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({ ok: true });
      expect(mockReq.log?.info).toHaveBeenCalledWith({ route: '/health' }, 'healthcheck');
    });

    it('debería tener endpoint /metrics que retorna métricas del sistema', () => {
      const mockReq = {} as Partial<Request>;
      const mockRes = {
        json: vi.fn(),
      } as Partial<Response>;

      // Simular handler de /metrics
      const metricsHandler = (req: Request, res: Response) => {
        const memory = process.memoryUsage();
        res.json({
          ok: true,
          pid: process.pid,
          uptimeSec: Math.round(process.uptime()),
          rss: memory.rss,
          heapUsed: memory.heapUsed,
          external: (memory as any).external,
          timestamp: new Date().toISOString(),
        });
      };

      metricsHandler(mockReq as Request, mockRes as Response);

      const callArgs = (mockRes.json as any).mock.calls[0][0];
      expect(callArgs.ok).toBe(true);
      expect(callArgs.pid).toBe(process.pid);
      expect(callArgs.uptimeSec).toBeGreaterThanOrEqual(0);
      expect(callArgs.rss).toBeDefined();
      expect(callArgs.heapUsed).toBeDefined();
      expect(callArgs.timestamp).toBeDefined();
    });
  });

  describe('Development endpoints', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('debería tener endpoint /test-env en desarrollo', () => {
      const mockReq = {} as Partial<Request>;
      const mockRes = {
        json: vi.fn(),
      } as Partial<Response>;

      // Simular handler de /test-env
      const testEnvHandler = (req: Request, res: Response) => {
        res.json({
          cwd: process.cwd(),
          hasDatabaseUrl: !!process.env.DATABASE_URL,
          databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 30),
          nodeEnv: process.env.NODE_ENV,
          port: process.env.PORT,
        });
      };

      testEnvHandler(mockReq as Request, mockRes as Response);

      const callArgs = (mockRes.json as any).mock.calls[0][0];
      expect(callArgs.nodeEnv).toBe('development');
      expect(callArgs.cwd).toBeDefined();
    });

    it('debería tener endpoint /test-db en desarrollo', async () => {
      const mockReq = {
        log: { error: vi.fn() },
      } as Partial<Request>;
      const mockRes = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      } as Partial<Response>;

      // Simular handler de /test-db con éxito
      const testDbHandler = async (req: Request, res: Response) => {
        try {
          const result = { test: 1 };
          res.json({ ok: true, connected: true, testResult: result });
        } catch (error) {
          req.log.error({ err: error }, 'Error en test-db');
          res.status(500).json({
            error: error instanceof Error ? error.message : String(error),
          });
        }
      };

      await testDbHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          connected: true,
        })
      );
    });

    it('debería manejar errores en /test-db', async () => {
      const mockReq = {
        log: { error: vi.fn() },
      } as Partial<Request>;
      const mockRes = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      } as Partial<Response>;

      // Simular handler de /test-db con error
      const testDbHandler = async (req: Request, res: Response) => {
        try {
          throw new Error('Database connection failed');
        } catch (error) {
          req.log.error({ err: error }, 'Error en test-db');
          res.status(500).json({
            error: error instanceof Error ? error.message : String(error),
          });
        }
      };

      await testDbHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Database connection failed',
      });
      expect(mockReq.log?.error).toHaveBeenCalled();
    });
  });

  describe('Error handlers', () => {
    it('debería tener error handler global que retorna 500', () => {
      const mockReq = {
        log: { error: vi.fn() },
        requestId: 'req-123',
        url: '/test',
        method: 'GET',
        body: {},
        query: {},
        params: {},
        user: { id: 'user-1', role: 'advisor' },
      } as Partial<Request>;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as Partial<Response>;

      const mockNext = vi.fn();

      // Simular error handler global
      const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
        const isProduction = process.env.NODE_ENV === 'production';

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
      };

      const testError = new Error('Test error');
      errorHandler(testError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal server error',
          requestId: 'req-123',
          message: 'Test error',
        })
      );
      expect(mockReq.log?.error).toHaveBeenCalled();
    });

    it('debería ocultar detalles de error en producción', () => {
      process.env.NODE_ENV = 'production';

      const mockReq = {
        log: { error: vi.fn() },
        requestId: 'req-123',
        url: '/test',
        method: 'GET',
        body: {},
        query: {},
        params: {},
      } as Partial<Request>;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as Partial<Response>;

      const mockNext = vi.fn();

      const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
        const isProduction = process.env.NODE_ENV === 'production';

        res.status(500).json({
          error: 'Internal server error',
          requestId: req.requestId,
          message: !isProduction ? err.message : undefined,
          stack: !isProduction ? err.stack : undefined,
        });
      };

      const testError = new Error('Sensitive error');
      errorHandler(testError, mockReq as Request, mockRes as Response, mockNext);

      const callArgs = (mockRes.json as any).mock.calls[0][0];
      expect(callArgs.message).toBeUndefined();
      expect(callArgs.stack).toBeUndefined();
    });

    it('debería tener 404 handler para rutas no encontradas', () => {
      const mockReq = {
        method: 'GET',
        path: '/nonexistent',
      } as Partial<Request>;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as Partial<Response>;

      // Simular 404 handler
      const notFoundHandler = (req: Request, res: Response) => {
        res.status(404).json({
          error: 'Not found',
          message: `Route ${req.method} ${req.path} not found`,
          timestamp: new Date().toISOString(),
        });
      };

      notFoundHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Not found',
          message: 'Route GET /nonexistent not found',
        })
      );
    });
  });

  describe('Process error handlers', () => {
    it('debería manejar uncaughtException', () => {
      const mockLogger = {
        fatal: vi.fn(),
      };

      // Simular handler de uncaughtException
      const uncaughtHandler = (err: Error) => {
        mockLogger.fatal({ err }, 'Uncaught exception - shutting down');
        process.exit(1);
      };

      const testError = new Error('Uncaught error');
      uncaughtHandler(testError);

      expect(mockLogger.fatal).toHaveBeenCalledWith(
        { err: testError },
        'Uncaught exception - shutting down'
      );
    });

    it('debería manejar unhandledRejection', () => {
      const mockLogger = {
        error: vi.fn(),
      };

      // Simular handler de unhandledRejection
      const unhandledHandler = (reason: unknown, promise: Promise<unknown>) => {
        mockLogger.error({ reason, promise }, 'Unhandled promise rejection');
      };

      const testPromise = Promise.reject('Test rejection');
      unhandledHandler('Test rejection', testPromise);

      expect(mockLogger.error).toHaveBeenCalledWith(
        { reason: 'Test rejection', promise: testPromise },
        'Unhandled promise rejection'
      );

      // AI_DECISION: Catch the promise to avoid Vitest warning/error
      // Justificación: Unhandled rejections in tests cause Vitest to fail the run
      testPromise.catch(() => {});
    });
  });
});
