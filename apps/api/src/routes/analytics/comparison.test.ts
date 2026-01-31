/**
 * Tests para analytics comparison routes
 *
 * AI_DECISION: Tests para endpoints de comparación de portfolios/benchmarks
 * Justificación: Validar comparación crítica de performance
 * Impacto: Prevenir errores en análisis de carteras
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import comparisonRouter from './comparison';
import { signUserToken } from '../../auth/jwt';
import { db } from '@maatwork/db';
import { createTestApp } from '../../__tests__/helpers/test-server';
import { getCachedUser } from '../../auth/cache';

// Mock dependencies
vi.mock('../../auth/cache', () => ({
  getCachedUser: vi.fn(),
  setCachedUser: vi.fn(),
}));

vi.mock('@maatwork/db/schema', () => ({
  portfolios: { id: 'p_id', name: 'p_name' },
  portfolioLines: {
    portfolioId: 'pl_portfolioId',
    instrumentId: 'pl_instrumentId',
    targetWeight: 'pl_targetWeight',
    targetType: 'pl_targetType',
  },
  benchmarkDefinitions: { id: 'bd_id', name: 'bd_name' },
  benchmarkComponents: {
    benchmarkId: 'bc_benchmarkId',
    instrumentId: 'bc_instrumentId',
    weight: 'bc_weight',
  },
  instruments: { id: 'i_id', symbol: 'i_symbol', name: 'i_name' },
  users: { id: 'u_id', role: 'u_role', isActive: 'u_isActive' },
}));

vi.mock('@maatwork/db', async () => {
  const actual = await vi.importActual('@maatwork/db');
  return {
    ...actual,
    db: vi.fn(),
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
  const mock: any = {};
  const chainable = () => mock;
  mock.select = vi.fn(chainable);
  mock.from = vi.fn(chainable);
  mock.where = vi.fn(chainable);
  mock.innerJoin = vi.fn(chainable);
  mock.leftJoin = vi.fn(chainable);
  mock.limit = vi.fn(chainable);
  mock.orderBy = vi.fn(chainable);
  mock.groupBy = vi.fn(chainable);
  mock.then = vi.fn().mockImplementation((onRes) => {
    return Promise.resolve(finalValue).then(onRes);
  });
  return mock;
};

describe('Analytics Comparison Routes', () => {
  const createTestAppWithRoutes = () =>
    createTestApp([{ path: '/analytics', router: comparisonRouter }]);

  const mockDb = vi.mocked(db);
  const mockGetCachedUser = vi.mocked(getCachedUser);
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();

    // Default mock for cache to avoid hitting DB in requireAuth
    mockGetCachedUser.mockReturnValue({ id: 'user-1', role: 'advisor', isActive: true });

    // Default mock for user lookup in requireAuth (as fallback)
    mockDb.mockImplementation(() =>
      createChainableMock([{ id: 'user-1', role: 'advisor', isActive: true }])
    );
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
      const mockCombinedResult = [
        {
          id: 'port-1',
          name: 'Portfolio 1',
          portfolioId: 'port-1',
          portfolioName: 'Portfolio 1',
          instrumentSymbol: 'AAPL',
          weight: 0.5,
          instrumentName: 'Apple Inc',
        },
      ];

      // Use mockImplementation to handle all sequential queries
      mockDb.mockImplementation(() => createChainableMock(mockCombinedResult));
      mockGetCachedUser.mockReturnValue({ id: 'user-1', role: 'advisor', isActive: true });

      (global.fetch as any).mockResolvedValue({
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
        .send({ portfolioIds: ['port-1'], period: '1Y' });

      if (res.status !== 200) {
        console.log('DEBUG: Response body on failure:', JSON.stringify(res.body));
      }
      expect(res.status).toBe(200);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      } else {
        expect(res.body.error).toBeUndefined(); // This will show the actual error message in failure output
      }
    });

    it('debería procesar comparación con benchmarks', async () => {
      const mockCombinedResult = [
        {
          id: 'bench-1',
          name: 'Benchmark 1',
          benchmarkId: 'bench-1',
          benchmarkName: 'Benchmark 1',
          instrumentSymbol: 'SPY',
          weight: 1.0,
          instrumentName: 'S&P 500',
        },
      ];

      // Use mockImplementation to handle calls
      mockDb.mockImplementation(() => createChainableMock(mockCombinedResult));
      mockGetCachedUser.mockReturnValue({ id: 'user-1', role: 'advisor', isActive: true });

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
      const mockCombinedResult = [
        {
          id: 'port-1',
          name: 'Portfolio 1',
          portfolioId: 'port-1',
          portfolioName: 'Portfolio 1',
          instrumentSymbol: 'AAPL',
          weight: 0.5,
          instrumentName: 'Apple Inc',
        },
      ];

      mockDb.mockImplementation(() => createChainableMock(mockCombinedResult));
      mockGetCachedUser.mockReturnValue({ id: 'user-1', role: 'advisor', isActive: true });

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
        .send({ portfolioIds: ['port-1'], period: '1Y' });

      if (res.status !== 200) {
        console.log('DEBUG: Fallback test failure body:', JSON.stringify(res.body));
      }
      expect(res.status).toBe(200);
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

      // Update mock to return staff role from DB and cache
      mockGetCachedUser.mockReturnValue({ id: 'user-1', role: 'staff', isActive: true });
      mockDb.mockReturnValue(
        createChainableMock([{ id: 'user-1', role: 'staff', isActive: true }])
      );

      await request(app)
        .post('/analytics/compare')
        .set('Cookie', `token=${token}`)
        .send({ portfolioIds: ['port-1'] })
        .expect(403);
    });

    it('debería retornar 404 si no se encuentran carteras', async () => {
      // Mock returns empty array
      mockDb.mockImplementation(() => createChainableMock([]));
      mockGetCachedUser.mockReturnValue({ id: 'user-1', role: 'advisor', isActive: true });

      const app = createTestAppWithRoutes();
      const token = await signUserToken({
        id: 'user-1',
        email: 'test@example.com',
        role: 'advisor',
      });

      const res = await request(app)
        .post('/analytics/compare')
        .set('Cookie', `token=${token}`)
        .send({ portfolioIds: ['non-existent'], period: '1Y' });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/No valid portfolios/i);
    });

    it('debería aceptar periodos válidos', async () => {
      const validPeriods = ['1M', '3M', '6M', '1Y', 'YTD', 'ALL'];
      const app = createTestAppWithRoutes();
      const token = await signUserToken({
        id: 'user-1',
        email: 'test@example.com',
        role: 'advisor',
      });

      for (const period of validPeriods) {
        // Mock returns items so it doesn't hit 404
        // MUST include portfolioId to match the grouping logic in comparison.ts
        mockDb.mockImplementation(() => createChainableMock([
          { 
            id: 'port-1', 
            name: 'Port 1', 
            portfolioId: 'port-1', 
            portfolioName: 'Port 1',
            instrumentSymbol: 'AAPL',
            instrumentName: 'Apple',
            weight: 1.0
          }
        ]));
        mockGetCachedUser.mockReturnValue({ id: 'user-1', role: 'advisor', isActive: true });

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({ status: 'success', data: { portfolios: { 'port-1': { performance_series: [] } } } }),
        });

        const res = await request(app)
          .post('/analytics/compare')
          .set('Cookie', `token=${token}`)
          .send({ portfolioIds: ['port-1'], period });

        if (res.status !== 200) {
          throw new Error(`Period ${period} failed with status ${res.status}: ${JSON.stringify(res.body)}`);
        }
        expect(res.status).toBe(200);
      }
    });
  });
});
