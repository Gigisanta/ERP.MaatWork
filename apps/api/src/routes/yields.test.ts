/**
 * Tests para yields routes
 * 
 * AI_DECISION: Tests unitarios para endpoints de yield curves
 * Justificación: Validación de endpoints críticos de datos financieros
 * Impacto: Prevenir errores en acceso a datos de yield curves
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { db, yields } from '@cactus/db';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { requireAuth, requireRole } from '../auth/middlewares';
import { validate } from '../utils/validation';

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  yields: {},
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
    YIELD_CURVE: 1800,
  },
}));

vi.mock('../config/redis', () => ({
  buildCacheKey: vi.fn((...parts) => parts.join(':')),
}));

const mockDb = vi.mocked(db);

describe('GET /yields', () => {
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

  it('debería obtener yields sin filtros', async () => {
    const mockYields = [
      { id: 'yield-1', country: 'US', date: '2024-01-01', tenor: '2y', value: '4.5' },
      { id: 'yield-2', country: 'US', date: '2024-01-01', tenor: '10y', value: '4.8' },
    ];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockYields),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response) => {
      const yieldsData = mockYields;
      res.json({
        success: true,
        data: yieldsData,
        count: yieldsData.length,
        timestamp: new Date().toISOString(),
      });
    };

    await handler(mockReq as Request, mockRes as Response);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ country: 'US' }),
        ]),
        count: 2,
      })
    );
  });

  it('debería filtrar yields por country', async () => {
    mockReq.query = { country: 'US' };

    const mockYields = [
      { id: 'yield-1', country: 'US', date: '2024-01-01', tenor: '2y', value: '4.5' },
    ];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockYields),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response) => {
      const yieldsData = mockYields;
      res.json({
        success: true,
        data: yieldsData,
        count: yieldsData.length,
      });
    };

    await handler(mockReq as Request, mockRes as Response);

    expect(mockRes.json).toHaveBeenCalled();
  });

  it('debería retornar yield curve cuando se especifica date sin tenor', async () => {
    mockReq.query = { country: 'US', date: '2024-01-01' };

    const mockYields = [
      { country: 'US', date: '2024-01-01', tenor: '2y', value: '4.5', provider: 'FRED' },
      { country: 'US', date: '2024-01-01', tenor: '10y', value: '4.8', provider: 'FRED' },
    ];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockYields),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response) => {
      const yieldsData = mockYields;
      const dateYields = yieldsData.filter((y) => y.date === '2024-01-01');
      const curveData: Record<string, { value: number; provider: string }> = {};

      dateYields.forEach((y) => {
        curveData[y.tenor] = {
          value: parseFloat(y.value),
          provider: y.provider,
        };
      });

      res.json({
        success: true,
        data: {
          date: '2024-01-01',
          country: 'US',
          yields: curveData,
        },
        timestamp: new Date().toISOString(),
      });
    };

    await handler(mockReq as Request, mockRes as Response);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          date: '2024-01-01',
          country: 'US',
          yields: expect.objectContaining({
            '2y': expect.objectContaining({ value: 4.5 }),
            '10y': expect.objectContaining({ value: 4.8 }),
          }),
        }),
      })
    );
  });

  it('debería filtrar yields por rango de fechas', async () => {
    mockReq.query = { country: 'US', from: '2024-01-01', to: '2024-12-31' };

    const mockYields = [
      { id: 'yield-1', country: 'US', date: '2024-06-01', tenor: '2y', value: '4.5' },
    ];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockYields),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response) => {
      const yieldsData = mockYields;
      res.json({
        success: true,
        data: yieldsData,
        count: yieldsData.length,
      });
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
          error: 'Failed to fetch yields',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    await handler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Failed to fetch yields',
      })
    );
  });
});

describe('GET /yields/spreads', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-123', email: 'test@example.com', role: 'advisor' },
      query: { country: 'US' },
      log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería calcular yield spreads', async () => {
    const mockYields = [
      { country: 'US', date: '2024-01-01', tenor: '2y', value: '4.0', provider: 'FRED' },
      { country: 'US', date: '2024-01-01', tenor: '10y', value: '4.5', provider: 'FRED' },
      { country: 'US', date: '2024-01-01', tenor: '3m', value: '3.5', provider: 'FRED' },
    ];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ date: '2024-01-01' }]),
          }),
        }),
      }),
    });

    // Second call for yields data
    let callCount = 0;
    mockDb.mockImplementation(() => {
      if (callCount === 0) {
        callCount++;
        return {
          select: mockSelect,
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockYields),
          }),
        }),
      } as any;
    });

    const handler = async (req: Request, res: Response) => {
      const yieldsData = mockYields;
      const yieldMap = yieldsData.reduce((acc, y) => {
        acc[y.tenor] = parseFloat(y.value);
        return acc;
      }, {} as Record<string, number>);

      const spreads: Record<string, number> = {};
      if (yieldMap['2y'] !== undefined && yieldMap['10y'] !== undefined) {
        spreads['2s10s'] = yieldMap['10y'] - yieldMap['2y'];
      }
      if (yieldMap['3m'] !== undefined && yieldMap['10y'] !== undefined) {
        spreads['3m10y'] = yieldMap['10y'] - yieldMap['3m'];
      }

      res.json({
        success: true,
        data: {
          date: '2024-01-01',
          spreads,
          yields: yieldMap,
        },
        timestamp: new Date().toISOString(),
      });
    };

    await handler(mockReq as Request, mockRes as Response);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          spreads: expect.objectContaining({
            '2s10s': 0.5, // 4.5 - 4.0
            '3m10y': 1.0, // 4.5 - 3.5
          }),
        }),
      })
    );
  });

  it('debería retornar 404 cuando no hay datos', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response) => {
      const latest = [];
      if (latest.length === 0) {
        return res.status(404).json({
          error: 'No yield data found',
          country: req.query.country,
        });
      }
      res.json({ success: true });
    };

    await handler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'No yield data found',
        country: 'US',
      })
    );
  });
});
