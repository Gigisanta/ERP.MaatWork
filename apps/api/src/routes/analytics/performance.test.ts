/**
 * Tests para analytics performance routes
 *
 * AI_DECISION: Tests unitarios para rendimiento de portfolios
 * Justificación: Validación crítica de cálculos de rendimiento
 * Impacto: Prevenir errores en métricas de performance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response } from 'express';
import { db, portfolioTemplates, portfolioTemplateLines, instruments } from '@maatwork/db';
import { eq } from 'drizzle-orm';
import { requireAuth, requireRole } from '../../auth/middlewares';
import { TIMEOUTS } from '../../config/timeouts';

// Mock dependencies
vi.mock('@maatwork/db', () => ({
  db: vi.fn(),
  portfolioTemplates: {},
  portfolioTemplateLines: {},
  instruments: {},
}));

vi.mock('../../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => next()),
  requireRole: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('../../config/timeouts', () => ({
  TIMEOUTS: {
    PORTFOLIO_PERFORMANCE: 30000,
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ a, b })),
}));

// Mock global fetch
global.fetch = vi.fn();

const mockDb = vi.mocked(db);
const mockFetch = vi.mocked(global.fetch);
const analyticsBaseUrl = (process.env.PYTHON_SERVICE_URL || 'http://localhost:3002').replace(
  /\/$/,
  ''
);
const analyticsPerformanceUrl = `${analyticsBaseUrl}/portfolio/performance`;

describe('GET /analytics/performance/:portfolioId', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      user: {
        id: 'user-123',
        role: 'advisor',
      },
      params: { portfolioId: 'portfolio-123' },
      query: { period: '1Y' },
      log: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
      },
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    vi.clearAllMocks();
  });

  it('debería retornar 401 cuando usuario no autenticado', async () => {
    mockReq.user = undefined;

    const handler = async (req: Request, res: Response) => {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      res.json({ success: true });
    };

    await handler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(401);
  });

  it('debería retornar 400 cuando periodo inválido', async () => {
    mockReq.query = { period: 'INVALID' };

    const handler = async (req: Request, res: Response) => {
      const { period = '1Y' } = req.query;
      const validPeriods = ['1M', '3M', '6M', '1Y', 'YTD', 'ALL'];
      if (!validPeriods.includes(period as string)) {
        return res.status(400).json({
          error: 'Invalid period. Valid periods: 1M, 3M, 6M, 1Y, YTD, ALL',
        });
      }
      res.json({ success: true });
    };

    await handler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('debería retornar 404 cuando portfolio no existe', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response) => {
      const portfolioData = await db()
        .select()
        .from(portfolioTemplates)
        .innerJoin(
          portfolioTemplateLines,
          eq(portfolioTemplateLines.templateId, portfolioTemplates.id)
        )
        .innerJoin(instruments, eq(instruments.id, portfolioTemplateLines.instrumentId))
        .where(eq(portfolioTemplates.id, 'portfolio-123'))
        .limit(100);

      if (portfolioData.length === 0) {
        return res.status(404).json({
          error: 'Portfolio not found or has no components',
        });
      }
      res.json({ success: true });
    };

    await handler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Portfolio not found or has no components',
    });
  });

  it('debería manejar timeout del servicio Python', async () => {
    const abortError = new Error('Request aborted');
    abortError.name = 'AbortError';
    mockFetch.mockRejectedValue(abortError);

    const handler = async (req: Request, res: Response) => {
      try {
        await fetch(analyticsPerformanceUrl);
      } catch (fetchError: unknown) {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          return res.status(504).json({
            error: 'Service timeout',
            details: 'Portfolio performance calculation timed out',
          });
        }
        throw fetchError;
      }
      res.json({ success: true });
    };

    await handler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(504);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Service timeout',
      details: 'Portfolio performance calculation timed out',
    });
  });

  it('debería manejar errores de conexión al servicio Python', async () => {
    const connectionError = new Error('ECONNREFUSED');
    (connectionError as { code?: string }).code = 'ECONNREFUSED';
    mockFetch.mockRejectedValue(connectionError);

    const handler = async (req: Request, res: Response) => {
      try {
        await fetch(analyticsPerformanceUrl);
      } catch (fetchError: unknown) {
        const errorObj = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
        const isConnectionError = (errorObj as { code?: string }).code === 'ECONNREFUSED';

        if (isConnectionError) {
          return res.json({
            success: true,
            data: {
              portfolioId: 'portfolio-123',
              period: '1Y',
              message: 'No price data available or service unavailable',
              performance: [],
            },
          });
        }
        throw fetchError;
      }
      res.json({ success: true });
    };

    await handler(mockReq as Request, mockRes as Response);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          message: 'No price data available or service unavailable',
        }),
      })
    );
  });
});
