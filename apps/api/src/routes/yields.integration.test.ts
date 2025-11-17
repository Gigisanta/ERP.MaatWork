/**
 * Tests de integración para yields routes usando supertest
 * 
 * AI_DECISION: Tests de integración para endpoints de yield curves
 * Justificación: Validar endpoints reales con Express y middleware completo
 * Impacto: Prevenir errores en acceso a datos de yield curves en producción
 */

import express from 'express';
import request from 'supertest';
import yieldsRouter from './yields';
import { signUserToken } from '../auth/jwt';
import { db } from '@cactus/db';
import { yields } from '@cactus/db/schema';
import { vi } from 'vitest';

// Mock db
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  yields: {},
}));

// Mock cache middleware
vi.mock('../middleware/cache', () => ({
  cache: vi.fn(() => (req: any, res: any, next: any) => next()),
  REDIS_TTL: {
    YIELD_CURVE: 1800,
  },
}));

vi.mock('../config/redis', () => ({
  buildCacheKey: vi.fn((...parts) => parts.join(':')),
}));

describe('Yields Routes Integration', () => {
  function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use('/yields', yieldsRouter);
    return app;
  }

  const mockDb = vi.mocked(db);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /yields', () => {
    it('debería retornar yields sin filtros', async () => {
      const mockYields = [
        { id: 'yield-1', country: 'US', date: '2024-01-01', tenor: '2y', value: '4.5', provider: 'FRED' },
        { id: 'yield-2', country: 'US', date: '2024-01-01', tenor: '10y', value: '4.8', provider: 'FRED' },
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

      const app = createTestApp();
      const token = await signUserToken({ id: 'user-1', email: 'test@example.com', role: 'advisor' });

      const res = await request(app)
        .get('/yields')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });

    it('debería filtrar por country', async () => {
      const mockYields = [
        { id: 'yield-1', country: 'US', date: '2024-01-01', tenor: '2y', value: '4.5', provider: 'FRED' },
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

      const app = createTestApp();
      const token = await signUserToken({ id: 'user-1', email: 'test@example.com', role: 'advisor' });

      const res = await request(app)
        .get('/yields?country=US')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('debería retornar yield curve cuando se especifica date sin tenor', async () => {
      const mockYields = [
        { country: 'US', date: '2024-01-01', tenor: '2y', value: '4.5', provider: 'FRED' },
        { country: 'US', date: '2024-01-01', tenor: '10y', value: '4.8', provider: 'FRED' },
      ];

      let callCount = 0;
      mockDb.mockImplementation(() => {
        if (callCount === 0) {
          callCount++;
          return {
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([{ date: '2024-01-01' }]),
                  }),
                }),
              }),
            }),
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

      const app = createTestApp();
      const token = await signUserToken({ id: 'user-1', email: 'test@example.com', role: 'advisor' });

      const res = await request(app)
        .get('/yields?country=US&date=2024-01-01')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('yields');
    });

    it('debería retornar 401 sin autenticación', async () => {
      const app = createTestApp();

      await request(app)
        .get('/yields')
        .expect(401);
    });

    it('debería retornar 403 para rol no autorizado', async () => {
      const app = createTestApp();
      const token = await signUserToken({ id: 'user-1', email: 'test@example.com', role: 'client' });

      await request(app)
        .get('/yields')
        .set('Cookie', `token=${token}`)
        .expect(403);
    });

    it('debería validar formato de fecha', async () => {
      const app = createTestApp();
      const token = await signUserToken({ id: 'user-1', email: 'test@example.com', role: 'advisor' });

      const res = await request(app)
        .get('/yields?date=invalid-date')
        .set('Cookie', `token=${token}`)
        .expect(400);

      expect(res.body.error).toBeDefined();
    });
  });

  describe('GET /yields/spreads', () => {
    it('debería calcular yield spreads', async () => {
      const mockYields = [
        { country: 'US', date: '2024-01-01', tenor: '2y', value: '4.0', provider: 'FRED' },
        { country: 'US', date: '2024-01-01', tenor: '10y', value: '4.5', provider: 'FRED' },
        { country: 'US', date: '2024-01-01', tenor: '3m', value: '3.5', provider: 'FRED' },
      ];

      let callCount = 0;
      mockDb.mockImplementation(() => {
        if (callCount === 0) {
          callCount++;
          return {
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([{ date: '2024-01-01' }]),
                  }),
                }),
              }),
            }),
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

      const app = createTestApp();
      const token = await signUserToken({ id: 'user-1', email: 'test@example.com', role: 'advisor' });

      const res = await request(app)
        .get('/yields/spreads?country=US')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('spreads');
    });

    it('debería retornar 404 cuando no hay datos', async () => {
      mockDb.mockReturnValue({
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      } as any);

      const app = createTestApp();
      const token = await signUserToken({ id: 'user-1', email: 'test@example.com', role: 'advisor' });

      const res = await request(app)
        .get('/yields/spreads?country=US')
        .set('Cookie', `token=${token}`)
        .expect(404);

      expect(res.body.error).toBeDefined();
    });
  });
});




