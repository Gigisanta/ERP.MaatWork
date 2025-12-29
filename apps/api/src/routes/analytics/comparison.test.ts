/**
 * Tests para analytics comparison routes
 *
 * AI_DECISION: Tests para endpoints de comparación de portfolios/benchmarks
 * Justificación: Validar comparación crítica de performance
 * Impacto: Prevenir errores en análisis de carteras
 */

import express from 'express';
import request from 'supertest';
import comparisonRouter from './comparison';
import { signUserToken } from '../../auth/jwt';
import { db } from '@maatwork/db';
import { createTestApp } from '../../__tests__/helpers/test-server';

// Mock dependencies
vi.mock('@maatwork/db', async () => {
  const actual = await vi.importActual('@maatwork/db');
  return {
    ...actual,
    db: vi.fn(),
    portfolioTemplates: { id: 'pt_id', name: 'pt_name' },
    portfolioTemplateLines: { templateId: 'ptl_templateId', instrumentId: 'ptl_instrumentId', targetWeight: 'ptl_targetWeight' },
    benchmarkDefinitions: { id: 'bd_id', name: 'bd_name' },
    benchmarkComponents: { benchmarkId: 'bc_benchmarkId', instrumentId: 'bc_instrumentId', weight: 'bc_weight' },
    instruments: { id: 'i_id', symbol: 'i_symbol', name: 'i_name' },
    users: { id: 'u_id', role: 'u_role', isActive: 'u_isActive' },
  };
});

vi.mock('drizzle-orm', async () => {
  const actual = await vi.importActual('drizzle-orm');
  return {
    ...actual,
    eq: vi.fn(() => ({})),
    inArray: vi.fn(() => ({})),
  };
});

vi.mock('../../config/timeouts', () => ({
  getPortfolioCompareTimeout: vi.fn(() => 30000),
}));

// Helper to create a chainable mock
const createChainableMock = (finalValue: unknown) => {
  const mock = vi.fn().mockImplementation(() => mock) as any;
  mock.select = vi.fn().mockReturnValue(mock);
  mock.from = vi.fn().mockReturnValue(mock);
  mock.where = vi.fn().mockReturnValue(mock);
  mock.innerJoin = vi.fn().mockReturnValue(mock);
  mock.limit = vi.fn().mockReturnValue(mock);
  mock.then = (onRes: (value: unknown) => void, onRej: (reason: unknown) => void) => 
    Promise.resolve(finalValue).then(onRes, onRej);
  return mock as unknown as ReturnType<typeof db>;
};

describe('Analytics Comparison Routes', () => {
  const createTestAppWithRoutes = () =>
    createTestApp([{ path: '/analytics', router: comparisonRouter }]);

  const mockDb = vi.mocked(db);
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    // Default mock for user lookup in requireAuth
    mockDb.mockReturnValue(createChainableMock([{ id: 'user-1', role: 'advisor', isActive: true }]));
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

      // Second call for portfolios, first was for requireAuth user lookup
      mockDb.mockReturnValueOnce(createChainableMock([{ id: 'user-1', role: 'advisor', isActive: true }]))
            .mockReturnValueOnce(createChainableMock(mockPortfolioData));

      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          data: {
            portfolios: {
              'port-1': {
                performance_series: [{ date: '2024-01-01', value: 100 }],
                total_return: 0.1,
                annualized_return: 0.1,
                volatility: 0.1,
                sharpe_ratio: 1.0,
                max_drawdown: -0.1,
              },
            },
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
        callCount++;
        if (callCount === 1) return createChainableMock([{ id: 'user-1', role: 'advisor', isActive: true }]); // requireAuth
        // No portfolioIds in request, so next call is benchmarkIds
        if (callCount === 2) return createChainableMock(mockBenchmarkData); // benchmarkIds
        return createChainableMock([]);
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          data: {
            portfolios: {
              'bench-1': {
                performance_series: [{ date: '2024-01-01', value: 100 }],
                total_return: 0.1,
                annualized_return: 0.1,
                volatility: 0.1,
                sharpe_ratio: 1.0,
                max_drawdown: -0.1,
              },
            },
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
      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createChainableMock([{ id: 'user-1', role: 'advisor', isActive: true }]); // requireAuth
        if (callCount === 2) return createChainableMock([
          {
            portfolioId: 'port-1',
            portfolioName: 'Portfolio 1',
            instrumentSymbol: 'AAPL',
            weight: 0.5,
            instrumentName: 'Apple Inc',
          }
        ]); // portfolioIds
        return createChainableMock([]);
      });

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
        .expect(200); // Because of the fallback in the code (it catches error and returns success: true with empty results)

      expect(res.body.success).toBe(true);
      expect(res.body.data.results).toHaveLength(0);
    });

    it('debería retornar 403 para rol no autorizado', async () => {
      const app = createTestAppWithRoutes();
      const token = await signUserToken({
        id: 'user-1',
        email: 'test@example.com',
        role: 'staff', // staff is NOT in ['advisor', 'manager', 'admin']
      });

      // Update mock to return staff role from DB
      mockDb.mockReturnValue(createChainableMock([{ id: 'user-1', role: 'staff', isActive: true }]));

      await request(app)
        .post('/analytics/compare')
        .set('Cookie', `token=${token}`)
        .send({ portfolioIds: ['port-1'] })
        .expect(403);
    });

    it('debería aceptar periodos válidos', async () => {
      const validPeriods = ['1M', '3M', '6M', '1Y', 'YTD', 'ALL'];

      for (const period of validPeriods) {
        mockDb.mockImplementation(() => createChainableMock([{ id: 'user-1', role: 'advisor', isActive: true }]));

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({ status: 'success', data: { portfolios: {} } }),
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

        // Status will be 404 because our mock returns [] for portfolios so portfoliosToCompare is empty
        expect(res.status).toBe(404);
      }
    });
  });
});
