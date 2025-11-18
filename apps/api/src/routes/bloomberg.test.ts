/**
 * Tests para bloomberg routes
 *
 * AI_DECISION: Tests unitarios para endpoints de Bloomberg
 * Justificación: Validación crítica de datos financieros
 * Impacto: Prevenir errores en visualización de datos financieros
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import bloombergRouter from './bloomberg';
import { signUserToken } from '../auth/jwt';

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  instruments: {},
  pricesDaily: {},
  pricesIntraday: {},
  eq: vi.fn(),
  and: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  desc: vi.fn(),
  sql: vi.fn(),
}));

vi.mock('../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => next()),
  requireRole: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('../utils/validation', () => ({
  validate: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('../middleware/cache', () => ({
  cache: vi.fn(() => (req, res, next) => next()),
  REDIS_TTL: {
    ASSET_SNAPSHOT: 60,
    INTRADAY: 300,
    OHLCV_DAILY: 600,
  },
}));

vi.mock('../config/redis', () => ({
  buildCacheKey: vi.fn((...parts) => parts.join(':')),
}));

import { db } from '@cactus/db';
import { instruments, pricesDaily, pricesIntraday, eq, desc } from '@cactus/db';

const mockDb = vi.mocked(db);

describe('Bloomberg Routes', () => {
  function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use('/bloomberg', bloombergRouter);
    return app;
  }

  let advisorToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    advisorToken = await signUserToken({
      id: 'advisor-123',
      email: 'advisor@example.com',
      role: 'advisor',
    });
  });

  describe('GET /bloomberg/assets/:symbol/snapshot', () => {
    it('debería retornar snapshot exitosamente', async () => {
      const mockSelectInstrument = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'inst-123',
                symbol: 'AAPL',
                name: 'Apple Inc.',
              },
            ]),
          }),
        }),
      });

      const mockSelectPrice = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  date: '2024-01-01',
                  open: '150.00',
                  high: '155.00',
                  low: '149.00',
                  close: '152.00',
                  volume: 1000000,
                },
              ]),
            }),
            offset: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  close: '150.00',
                },
              ]),
            }),
          }),
        }),
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: mockSelectInstrument } as any;
        }
        return { select: mockSelectPrice } as any;
      });

      const app = createTestApp();
      const res = await request(app)
        .get('/bloomberg/assets/AAPL/snapshot')
        .set('Cookie', `token=${advisorToken}`)
        .expect(200);

      expect(res.body).toEqual({
        symbol: 'AAPL',
        instrument: expect.objectContaining({
          id: 'inst-123',
          symbol: 'AAPL',
        }),
        price: expect.objectContaining({
          date: '2024-01-01',
          close: '152.00',
        }),
        change: expect.any(Number),
        changePercent: expect.any(Number),
      });
    });

    it('debería retornar 404 cuando instrument no existe', async () => {
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

      const app = createTestApp();
      const res = await request(app)
        .get('/bloomberg/assets/INVALID/snapshot')
        .set('Cookie', `token=${advisorToken}`)
        .expect(404);

      expect(res.body).toEqual({
        error: 'Instrument not found',
        symbol: 'INVALID',
      });
    });

    it('debería retornar 404 cuando no hay price data', async () => {
      const mockSelectInstrument = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'inst-123',
                symbol: 'AAPL',
              },
            ]),
          }),
        }),
      });

      const mockSelectPrice = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: mockSelectInstrument } as any;
        }
        return { select: mockSelectPrice } as any;
      });

      const app = createTestApp();
      const res = await request(app)
        .get('/bloomberg/assets/AAPL/snapshot')
        .set('Cookie', `token=${advisorToken}`)
        .expect(404);

      expect(res.body).toEqual({
        error: 'No price data available',
        symbol: 'AAPL',
      });
    });
  });

  describe('GET /bloomberg/assets/:symbol/ohlcv', () => {
    it('debería retornar OHLCV data exitosamente', async () => {
      const mockSelectInstrument = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'inst-123',
                symbol: 'AAPL',
              },
            ]),
          }),
        }),
      });

      const mockSelectPrice = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  date: '2024-01-01',
                  open: '150.00',
                  high: '155.00',
                  low: '149.00',
                  close: '152.00',
                  volume: 1000000,
                },
              ]),
            }),
          }),
        }),
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: mockSelectInstrument } as any;
        }
        return { select: mockSelectPrice } as any;
      });

      const app = createTestApp();
      const res = await request(app)
        .get('/bloomberg/assets/AAPL/ohlcv?timeframe=1d')
        .set('Cookie', `token=${advisorToken}`)
        .expect(200);

      expect(res.body).toEqual({
        symbol: 'AAPL',
        timeframe: '1d',
        data: expect.arrayContaining([
          expect.objectContaining({
            date: '2024-01-01',
            open: '150.00',
            high: '155.00',
            low: '149.00',
            close: '152.00',
            volume: 1000000,
          }),
        ]),
      });
    });

    it('debería validar timeframe', async () => {
      const app = createTestApp();
      const res = await request(app)
        .get('/bloomberg/assets/AAPL/ohlcv?timeframe=invalid')
        .set('Cookie', `token=${advisorToken}`)
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });
  });
});
