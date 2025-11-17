/**
 * Tests de integración para macro routes usando supertest
 * 
 * AI_DECISION: Tests de integración para endpoints de datos macroeconómicos
 * Justificación: Validar endpoints reales con Express y middleware completo
 * Impacto: Prevenir errores en acceso a datos macro en producción
 */

import express from 'express';
import request from 'supertest';
import macroRouter from './macro';
import { signUserToken } from '../auth/jwt';
import { db } from '@cactus/db';
import { macroSeries, macroPoints } from '@cactus/db/schema';
import { vi } from 'vitest';

// Mock db
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  macroSeries: {},
  macroPoints: {},
}));

// Mock cache middleware
vi.mock('../middleware/cache', () => ({
  cache: vi.fn(() => (req: any, res: any, next: any) => next()),
  REDIS_TTL: {
    MACRO_SERIES_LIST: 3600,
    MACRO_SERIES: 1800,
  },
}));

vi.mock('../config/redis', () => ({
  buildCacheKey: vi.fn((...parts) => parts.join(':')),
}));

describe('Macro Routes Integration', () => {
  function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use('/macro', macroRouter);
    return app;
  }

  const mockDb = vi.mocked(db);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /macro/series', () => {
    it('debería retornar lista de series macro', async () => {
      const mockSeries = [
        { id: 'series-1', seriesId: 'GDP_US', name: 'US GDP', provider: 'FRED', country: 'US', active: true },
        { id: 'series-2', seriesId: 'INFLATION_US', name: 'US Inflation', provider: 'FRED', country: 'US', active: true },
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

      const app = createTestApp();
      const token = await signUserToken({ id: 'user-1', email: 'test@example.com', role: 'advisor' });

      const res = await request(app)
        .get('/macro/series')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('seriesId', 'GDP_US');
    });

    it('debería filtrar por provider', async () => {
      const mockSeries = [
        { id: 'series-1', seriesId: 'GDP_US', provider: 'FRED', country: 'US', active: true },
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

      const app = createTestApp();
      const token = await signUserToken({ id: 'user-1', email: 'test@example.com', role: 'advisor' });

      const res = await request(app)
        .get('/macro/series?provider=FRED')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('debería filtrar por country', async () => {
      const mockSeries = [
        { id: 'series-1', seriesId: 'GDP_US', provider: 'FRED', country: 'US', active: true },
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

      const app = createTestApp();
      const token = await signUserToken({ id: 'user-1', email: 'test@example.com', role: 'advisor' });

      const res = await request(app)
        .get('/macro/series?country=US')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('debería retornar 401 sin autenticación', async () => {
      const app = createTestApp();

      await request(app)
        .get('/macro/series')
        .expect(401);
    });

    it('debería retornar 403 para rol no autorizado', async () => {
      const app = createTestApp();
      const token = await signUserToken({ id: 'user-1', email: 'test@example.com', role: 'client' });

      await request(app)
        .get('/macro/series')
        .set('Cookie', `token=${token}`)
        .expect(403);
    });

    it('debería manejar errores de base de datos', async () => {
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

      const app = createTestApp();
      const token = await signUserToken({ id: 'user-1', email: 'test@example.com', role: 'advisor' });

      const res = await request(app)
        .get('/macro/series')
        .set('Cookie', `token=${token}`)
        .expect(500);

      expect(res.body.error).toBeDefined();
    });
  });

  describe('GET /macro/:seriesId', () => {
    it('debería retornar datos de serie macro', async () => {
      const mockSeries = [
        { id: 'series-uuid', seriesId: 'GDP_US', name: 'US GDP', provider: 'FRED' },
      ];

      const mockPoints = [
        { id: 'point-1', seriesId: 'GDP_US', date: '2024-01-01', value: '25000' },
        { id: 'point-2', seriesId: 'GDP_US', date: '2024-02-01', value: '25100' },
      ];

      let callCount = 0;
      mockDb.mockImplementation(() => {
        if (callCount === 0) {
          callCount++;
          return {
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue(mockSeries),
                }),
              }),
            }),
          } as any;
        }
        return {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue(mockPoints),
                }),
              }),
            }),
          }),
        } as any;
      });

      const app = createTestApp();
      const token = await signUserToken({ id: 'user-1', email: 'test@example.com', role: 'advisor' });

      const res = await request(app)
        .get('/macro/GDP_US')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('series');
      expect(res.body.data).toHaveProperty('points');
    });

    it('debería retornar 404 cuando serie no existe', async () => {
      mockDb.mockReturnValue({
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any);

      const app = createTestApp();
      const token = await signUserToken({ id: 'user-1', email: 'test@example.com', role: 'advisor' });

      const res = await request(app)
        .get('/macro/NONEXISTENT')
        .set('Cookie', `token=${token}`)
        .expect(404);

      expect(res.body.error).toBeDefined();
    });

    it('debería filtrar puntos por rango de fechas', async () => {
      const mockSeries = [{ id: 'series-uuid', seriesId: 'GDP_US' }];
      const mockPoints = [{ id: 'point-1', seriesId: 'GDP_US', date: '2024-06-01', value: '25000' }];

      let callCount = 0;
      mockDb.mockImplementation(() => {
        if (callCount === 0) {
          callCount++;
          return {
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue(mockSeries),
                }),
              }),
            }),
          } as any;
        }
        return {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue(mockPoints),
                }),
              }),
            }),
          }),
        } as any;
      });

      const app = createTestApp();
      const token = await signUserToken({ id: 'user-1', email: 'test@example.com', role: 'advisor' });

      const res = await request(app)
        .get('/macro/GDP_US?from=2024-01-01&to=2024-12-31')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('debería validar formato de fecha', async () => {
      const app = createTestApp();
      const token = await signUserToken({ id: 'user-1', email: 'test@example.com', role: 'advisor' });

      const res = await request(app)
        .get('/macro/GDP_US?from=invalid-date')
        .set('Cookie', `token=${token}`)
        .expect(400);

      expect(res.body.error).toBeDefined();
    });
  });
});




