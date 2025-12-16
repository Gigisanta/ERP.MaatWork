/**
 * Tests para analytics comparison routes
 *
 * AI_DECISION: Tests para endpoints de comparación de portfolios/benchmarks
 * Justificación: Validar comparación crítica de performance
 * Impacto: Prevenir errores en análisis de carteras
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import comparisonRouter from './comparison';
import { signUserToken } from '../../auth/jwt';
import { db } from '@cactus/db';
import { createTestApp } from '../../__tests__/helpers/test-server';
import { vi } from 'vitest';

// Mock db
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  portfolioTemplates: {},
  portfolioTemplateLines: {},
  benchmarkDefinitions: {},
  benchmarkComponents: {},
  instruments: {},
}));

vi.mock('../../config/timeouts', () => ({
  getPortfolioCompareTimeout: vi.fn(() => 30000),
}));

describe('Analytics Comparison Routes', () => {
  const createTestAppWithRoutes = () =>
    createTestApp([{ path: '/analytics', router: comparisonRouter }]);

  const mockDb = vi.mocked(db);
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('POST /analytics/compare', () => {
    it('debería retornar 401 sin autenticación', async () => {
      const app = createTestAppWithRoutes();

      await request(app)
        .post('/analytics/compare')
        .send({ portfolioIds: ['port-1'] })
        .expect(401);
    });

    it('debería retornar 400 cuando no hay portfolios ni benchmarks', async () => {
      const app = createTestAppWithRoutes();
      const token = await signUserToken({
        id: 'user-1',
        email: 'test@example.com',
        role: 'advisor',
      });

      const res = await request(app)
        .post('/analytics/compare')
        .set('Cookie', `token=${token}`)
        .send({})
        .expect(400);

      expect(res.body.error).toContain('At least one portfolio or benchmark ID');
    });

    it('debería retornar 400 para periodo inválido', async () => {
      const app = createTestAppWithRoutes();
      const token = await signUserToken({
        id: 'user-1',
        email: 'test@example.com',
        role: 'advisor',
      });

      const res = await request(app)
        .post('/analytics/compare')
        .set('Cookie', `token=${token}`)
        .send({ portfolioIds: ['port-1'], period: 'INVALID' })
        .expect(400);

      expect(res.body.error).toContain('Invalid period');
    });

    it('debería procesar comparación con portfolios', async () => {
      const mockPortfolioData = [
        {
          portfolioId: 'port-1',
          portfolioName: 'Portfolio 1',
          instrumentSymbol: 'AAPL',
          weight: 0.5,
          instrumentName: 'Apple Inc',
        },
      ];

      mockDb.mockReturnValue({
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(mockPortfolioData),
              }),
            }),
          }),
        }),
      } as any);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            portfolios: [
              {
                id: 'port-1',
                name: 'Portfolio 1',
                data: [{ date: '2024-01-01', value: 100 }],
              },
            ],
          },
        }),
      });

      const app = createTestAppWithRoutes();
      const token = await signUserToken({
        id: 'user-1',
        email: 'test@example.com',
        role: 'advisor',
      });

      const res = await request(app)
        .post('/analytics/compare')
        .set('Cookie', `token=${token}`)
        .send({ portfolioIds: ['port-1'], period: '1Y' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('debería procesar comparación con benchmarks', async () => {
      const mockBenchmarkData = [
        {
          benchmarkId: 'bench-1',
          benchmarkName: 'Benchmark 1',
          instrumentSymbol: 'SPY',
          weight: 1.0,
          instrumentName: 'S&P 500',
        },
      ];

      let callCount = 0;
      mockDb.mockImplementation(() => {
        if (callCount === 0) {
          callCount++;
          // Primera llamada para portfolios (vacía)
          return {
            select: vi.fn().mockReturnValue({
              from: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                  innerJoin: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([]),
                  }),
                }),
              }),
            }),
          } as any;
        }
        // Segunda llamada para benchmarks
        return {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue(mockBenchmarkData),
                }),
              }),
            }),
          }),
        } as any;
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            benchmarks: [
              {
                id: 'bench-1',
                name: 'Benchmark 1',
                data: [{ date: '2024-01-01', value: 100 }],
              },
            ],
          },
        }),
      });

      const app = createTestAppWithRoutes();
      const token = await signUserToken({
        id: 'user-1',
        email: 'test@example.com',
        role: 'advisor',
      });

      const res = await request(app)
        .post('/analytics/compare')
        .set('Cookie', `token=${token}`)
        .send({ benchmarkIds: ['bench-1'], period: '1Y' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('debería manejar error del servicio Python', async () => {
      mockDb.mockReturnValue({
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      } as any);

      (global.fetch as any).mockRejectedValue(new Error('Python service error'));

      const app = createTestAppWithRoutes();
      const token = await signUserToken({
        id: 'user-1',
        email: 'test@example.com',
        role: 'advisor',
      });

      const res = await request(app)
        .post('/analytics/compare')
        .set('Cookie', `token=${token}`)
        .send({ portfolioIds: ['port-1'], period: '1Y' })
        .expect(500);

      expect(res.body.error).toBeDefined();
    });

    it('debería retornar 403 para rol no autorizado', async () => {
      const app = createTestAppWithRoutes();
      const token = await signUserToken({
        id: 'user-1',
        email: 'test@example.com',
        role: 'client',
      });

      await request(app)
        .post('/analytics/compare')
        .set('Cookie', `token=${token}`)
        .send({ portfolioIds: ['port-1'] })
        .expect(403);
    });

    it('debería aceptar periodos válidos', async () => {
      const validPeriods = ['1M', '3M', '6M', '1Y', 'YTD', 'ALL'];

      for (const period of validPeriods) {
        mockDb.mockReturnValue({
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        } as any);

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({ success: true, data: {} }),
        });

        const app = createTestAppWithRoutes();
        const token = await signUserToken({
          id: 'user-1',
          email: 'test@example.com',
          role: 'advisor',
        });

        const res = await request(app)
          .post('/analytics/compare')
          .set('Cookie', `token=${token}`)
          .send({ portfolioIds: ['port-1'], period });

        // Debería aceptar el periodo válido (puede fallar por otros motivos pero no por periodo inválido)
        expect([200, 500]).toContain(res.status);
      }
    });
  });
});
