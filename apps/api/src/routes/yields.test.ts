/**
 * Tests para yields routes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import yieldsRouter from './yields';
import { signUserToken } from '../auth/jwt';

vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  yields: {},
  eq: vi.fn(),
  and: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  desc: vi.fn()
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
  REDIS_TTL: { YIELD_CURVE: 600 }
}));

vi.mock('../config/redis', () => ({
  buildCacheKey: vi.fn((...parts) => parts.join(':'))
}));

import { db } from '@cactus/db';
import { yields, eq, desc } from '@cactus/db';

const mockDb = vi.mocked(db);

describe('Yields Routes', () => {
  function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use('/yields', yieldsRouter);
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

  describe('GET /yields', () => {
    it('debería retornar yields list exitosamente', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([
              {
                id: 'yield-1',
                country: 'US',
                date: '2024-01-01',
                tenor: '2Y',
                value: 4.5
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
        .get('/yields?country=US')
        .set('Cookie', `token=${advisorToken}`)
        .expect(200);

      expect(res.body).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            country: 'US',
            date: '2024-01-01',
            tenor: '2Y',
            value: 4.5
          })
        ])
      });
    });

    it('debería filtrar por fecha', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([])
          })
        })
      });

      mockDb.mockReturnValue({
        select: mockSelect
      } as any);

      const app = createTestApp();
      const res = await request(app)
        .get('/yields?date=2024-01-01')
        .set('Cookie', `token=${advisorToken}`)
        .expect(200);

      expect(res.body.data).toEqual([]);
    });
  });

  describe('GET /yields/spreads', () => {
    it('debería calcular spreads exitosamente', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([
              { date: '2024-01-01', tenor: '2Y', value: 4.0 },
              { date: '2024-01-01', tenor: '10Y', value: 4.5 }
            ])
          })
        })
      });

      mockDb.mockReturnValue({
        select: mockSelect
      } as any);

      const app = createTestApp();
      const res = await request(app)
        .get('/yields/spreads?spread=2s10s&country=US')
        .set('Cookie', `token=${advisorToken}`)
        .expect(200);

      expect(res.body).toEqual({
        spread: '2s10s',
        data: expect.arrayContaining([
          expect.objectContaining({
            date: '2024-01-01',
            value: expect.any(Number)
          })
        ])
      });
    });
  });
});



