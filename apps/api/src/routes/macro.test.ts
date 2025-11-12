/**
 * Tests para macro routes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import macroRouter from './macro';
import { signUserToken } from '../auth/jwt';

vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  macroSeries: {},
  macroPoints: {},
  eq: vi.fn(),
  and: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  desc: vi.fn(),
  sql: vi.fn()
}));

vi.mock('../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => next()),
  requireRole: vi.fn(() => (req, res, next) => next())
}));

vi.mock('../utils/validation', () => ({
  validate: vi.fn(() => (req, res, next) => next())
}));

vi.mock('../middleware/cache', () => ({
  cache: vi.fn(() => (req, res, next) => next()),
  REDIS_TTL: { MACRO_SERIES: 1800, MACRO_SERIES_LIST: 86400 }
}));

vi.mock('../config/redis', () => ({
  buildCacheKey: vi.fn((...parts) => parts.join(':'))
}));

import { db } from '@cactus/db';
import { macroSeries, macroPoints, eq, desc } from '@cactus/db';

const mockDb = vi.mocked(db);

describe('Macro Routes', () => {
  function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use('/macro', macroRouter);
    return app;
  }

  let advisorToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    advisorToken = await signUserToken({
      id: 'advisor-123',
      email: 'advisor@example.com',
      role: 'advisor'
    });
  });

  describe('GET /macro/series', () => {
    it('debería retornar series list exitosamente', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([
              {
                id: 'series-1',
                provider: 'FRED',
                country: 'US',
                category: 'Employment',
                active: true
              }
            ])
          })
        })
      });

      mockDb.mockReturnValue({
        select: mockSelect
      } as any);

      const app = createTestApp();
      const res = await request(app)
        .get('/macro/series?country=US')
        .set('Cookie', `token=${advisorToken}`)
        .expect(200);

      expect(res.body).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'series-1',
            country: 'US'
          })
        ])
      });
    });
  });

  describe('GET /macro/:seriesId', () => {
    it('debería retornar series data exitosamente', async () => {
      const mockSelectSeries = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 'series-1',
              name: 'GDP',
              provider: 'FRED'
            }])
          })
        })
      });

      const mockSelectPoints = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  date: '2024-01-01',
                  value: 100.5
                }
              ])
            })
          })
        })
      });

      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { select: mockSelectSeries } as any;
        }
        return { select: mockSelectPoints } as any;
      });

      const app = createTestApp();
      const res = await request(app)
        .get('/macro/series-1')
        .set('Cookie', `token=${advisorToken}`)
        .expect(200);

      expect(res.body).toEqual({
        series: expect.objectContaining({
          id: 'series-1',
          name: 'GDP'
        }),
        points: expect.arrayContaining([
          expect.objectContaining({
            date: '2024-01-01',
            value: 100.5
          })
        ])
      });
    });

    it('debería retornar 404 cuando series no existe', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      mockDb.mockReturnValue({
        select: mockSelect
      } as any);

      const app = createTestApp();
      const res = await request(app)
        .get('/macro/invalid-series')
        .set('Cookie', `token=${advisorToken}`)
        .expect(404);

      expect(res.body).toEqual({
        error: 'Series not found'
      });
    });
  });
});


