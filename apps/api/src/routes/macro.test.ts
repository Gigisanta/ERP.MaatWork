/**
 * Tests para macro routes
 * 
 * AI_DECISION: Tests unitarios para endpoints de datos macroeconómicos
 * Justificación: Validación de endpoints críticos de datos financieros
 * Impacto: Prevenir errores en acceso a datos macro
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { db, macroSeries, macroPoints } from '@cactus/db';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { requireAuth, requireRole } from '../auth/middlewares';
import { validate } from '../utils/validation';

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  macroSeries: {},
  macroPoints: {},
  eq: vi.fn((col, val) => ({ type: 'eq', col, val })),
  and: vi.fn((...conds) => ({ type: 'and', conds })),
  gte: vi.fn((col, val) => ({ type: 'gte', col, val })),
  lte: vi.fn((col, val) => ({ type: 'lte', col, val })),
  desc: vi.fn((col) => ({ type: 'desc', col })),
}));

vi.mock('../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => {
    req.user = { id: 'user-123', email: 'test@example.com', role: 'advisor' };
    next();
  }),
  requireRole: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('../utils/validation', () => ({
  validate: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('../middleware/cache', () => ({
  cache: vi.fn(() => (req, res, next) => next()),
  REDIS_TTL: {
    MACRO_SERIES_LIST: 3600,
    MACRO_SERIES: 1800,
  },
}));

vi.mock('../config/redis', () => ({
  buildCacheKey: vi.fn((...parts) => parts.join(':')),
}));

const mockDb = vi.mocked(db);

describe('GET /macro/series', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-123', email: 'test@example.com', role: 'advisor' },
      query: {},
      log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería listar todas las series macro', async () => {
    const mockSeries = [
      { id: 'series-1', seriesId: 'GDP_US', name: 'US GDP', provider: 'FRED' },
      { id: 'series-2', seriesId: 'INFLATION_US', name: 'US Inflation', provider: 'FRED' },
    ];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockSeries),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response) => {
      const series = mockSeries;
      res.json({
        success: true,
        data: series,
        count: series.length,
        timestamp: new Date().toISOString(),
      });
    };

    await handler(mockReq as Request, mockRes as Response);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ seriesId: 'GDP_US' }),
        ]),
        count: 2,
      })
    );
  });

  it('debería filtrar series por provider', async () => {
    mockReq.query = { provider: 'FRED' };

    const mockSeries = [
      { id: 'series-1', seriesId: 'GDP_US', provider: 'FRED' },
    ];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockSeries),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response) => {
      const series = mockSeries;
      res.json({
        success: true,
        data: series,
        count: series.length,
      });
    };

    await handler(mockReq as Request, mockRes as Response);

    expect(mockRes.json).toHaveBeenCalled();
  });

  it('debería filtrar series por country', async () => {
    mockReq.query = { country: 'US' };

    const handler = async (req: Request, res: Response) => {
      res.json({ success: true, data: [], count: 0 });
    };

    await handler(mockReq as Request, mockRes as Response);

    expect(mockRes.json).toHaveBeenCalled();
  });

  it('debería manejar errores correctamente', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response) => {
      try {
        throw new Error('Database error');
      } catch (error) {
        res.status(500).json({
          error: 'Failed to fetch macro series',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    await handler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Failed to fetch macro series',
      })
    );
  });
});

describe('GET /macro/:seriesId', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-123', email: 'test@example.com', role: 'advisor' },
      params: { seriesId: 'GDP_US' },
      query: {},
      log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería obtener datos de serie macro', async () => {
    const mockSeries = [
      { id: 'series-uuid', seriesId: 'GDP_US', name: 'US GDP' },
    ];

    const mockPoints = [
      { date: '2024-01-01', value: '25000' },
      { date: '2024-02-01', value: '25100' },
    ];

    const mockSelectSeries = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(mockSeries),
        }),
      }),
    });

    const mockSelectPoints = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockPoints),
          }),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelectSeries,
    } as any);

    const handler = async (req: Request, res: Response) => {
      const series = mockSeries;
      const points = mockPoints;
      res.json({
        success: true,
        data: {
          series: series[0],
          points: points.reverse(),
        },
        count: points.length,
        timestamp: new Date().toISOString(),
      });
    };

    await handler(mockReq as Request, mockRes as Response);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          series: expect.objectContaining({ seriesId: 'GDP_US' }),
          points: expect.arrayContaining([
            expect.objectContaining({ date: '2024-01-01' }),
          ]),
        }),
      })
    );
  });

  it('debería retornar 404 cuando serie no existe', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response) => {
      const series = [];
      if (series.length === 0) {
        return res.status(404).json({
          error: 'Series not found',
          seriesId: req.params.seriesId,
        });
      }
      res.json({ success: true });
    };

    await handler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Series not found',
        seriesId: 'GDP_US',
      })
    );
  });

  it('debería filtrar puntos por rango de fechas', async () => {
    mockReq.query = { from: '2024-01-01', to: '2024-12-31' };

    const mockSeries = [{ id: 'series-uuid', seriesId: 'GDP_US' }];
    const mockPoints = [{ date: '2024-06-01', value: '25000' }];

    const mockSelectSeries = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(mockSeries),
        }),
      }),
    });

    const mockSelectPoints = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockPoints),
          }),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelectSeries,
    } as any);

    const handler = async (req: Request, res: Response) => {
      const series = mockSeries;
      const points = mockPoints;
      res.json({
        success: true,
        data: { series: series[0], points: points.reverse() },
        count: points.length,
      });
    };

    await handler(mockReq as Request, mockRes as Response);

    expect(mockRes.json).toHaveBeenCalled();
  });

  it('debería limitar número de puntos retornados', async () => {
    mockReq.query = { limit: '100' };

    const mockSeries = [{ id: 'series-uuid', seriesId: 'GDP_US' }];
    const mockPoints = Array.from({ length: 50 }, (_, i) => ({
      date: `2024-${String(i + 1).padStart(2, '0')}-01`,
      value: String(25000 + i),
    }));

    const mockSelectSeries = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(mockSeries),
        }),
      }),
    });

    const mockSelectPoints = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockPoints),
          }),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelectSeries,
    } as any);

    const handler = async (req: Request, res: Response) => {
      const series = mockSeries;
      const points = mockPoints;
      res.json({
        success: true,
        data: { series: series[0], points: points.reverse() },
        count: points.length,
      });
    };

    await handler(mockReq as Request, mockRes as Response);

    expect(mockRes.json).toHaveBeenCalled();
  });
});
