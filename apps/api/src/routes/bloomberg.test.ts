/**
 * Tests para bloomberg routes
 *
 * AI_DECISION: Tests unitarios para endpoints de Bloomberg
 * Justificación: Validación crítica de datos financieros
 * Impacto: Prevenir errores en visualización de datos financieros
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import bloombergRouter from './bloomberg';
import { signUserToken } from '../auth/jwt';
import { createTestApp } from '../__tests__/helpers/test-server';
import { db } from '@maatwork/db';

// Mock dependencies
const mockDb = vi.fn();

vi.mock('@maatwork/db', () => ({
  db: () => mockDb(),
  instruments: { symbol: 'i_symbol', active: 'i_active', id: 'i_id' },
  pricesDaily: { assetId: 'pd_assetId', date: 'pd_date' },
  pricesIntraday: { assetId: 'pi_assetId', date: 'pi_date' },
}));

vi.mock('@maatwork/db/schema', () => ({
  instruments: { symbol: 'i_symbol', active: 'i_active', id: 'i_id' },
  pricesDaily: { assetId: 'pd_assetId', date: 'pd_date' },
  pricesIntraday: { assetId: 'pi_assetId', date: 'pi_date' },
}));

vi.mock('../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => {
    req.user = { id: 'advisor-123', role: 'advisor', email: 'advisor@example.com' };
    next();
  }),
  requireRole: vi.fn(() => (req, res, next) => next()),
}));

vi.mock('drizzle-orm', async (importActual) => {
  const actual = await importActual<Record<string, unknown>>();
  return {
    ...actual,
    eq: vi.fn(() => ({})),
    desc: vi.fn(() => ({})),
    and: vi.fn(() => ({})),
    gte: vi.fn(() => ({})),
    lte: vi.fn(() => ({})),
  };
});

vi.mock('../middleware/cache', () => ({
  cache: vi.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
  REDIS_TTL: {
    ASSET_SNAPSHOT: 60,
    INTRADAY: 300,
    OHLCV_DAILY: 600,
  },
}));

vi.mock('../config/redis', () => ({
  buildCacheKey: vi.fn((...parts) => parts.join(':')),
  REDIS_TTL: {
    ASSET_SNAPSHOT: 60,
    INTRADAY: 300,
    OHLCV_DAILY: 600,
    LONG_CACHE: 86400,
  },
}));

// Helper to create a chainable mock
const createChainableMock = (finalValue: unknown) => {
  const mock = vi.fn().mockImplementation(() => mock) as any;
  mock.select = vi.fn().mockReturnValue(mock);
  mock.from = vi.fn().mockReturnValue(mock);
  mock.where = vi.fn().mockReturnValue(mock);
  mock.orderBy = vi.fn().mockReturnValue(mock);
  mock.limit = vi.fn().mockReturnValue(mock);
  mock.offset = vi.fn().mockReturnValue(mock);
  mock.insert = vi.fn().mockReturnValue(mock);
  mock.values = vi.fn().mockReturnValue(mock);
  mock.execute = vi.fn().mockResolvedValue(finalValue);
  mock.onConflictDoNothing = vi.fn().mockReturnValue(mock);
  mock.then = (onRes: (value: unknown) => void, onRej: (reason: unknown) => void) => 
    Promise.resolve(finalValue).then(onRes, onRej);
  return mock as unknown as ReturnType<typeof db>;
};

// Mock global fetch for Python service calls
global.fetch = vi.fn();

describe('Bloomberg Routes', () => {
  const createTestAppWithRoutes = () =>
    createTestApp([{ path: '/bloomberg', router: bloombergRouter }]);

  let advisorToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    (global.fetch as vi.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ success: false }),
    });
    advisorToken = await signUserToken({
      id: 'advisor-123',
      email: 'advisor@example.com',
      role: 'advisor',
    });
    
    // AI_DECISION: Robust permanent mock for db()
    // Justificación: requireAuth and other middlewares might call db() at unexpected times.
    // Ensure it always returns something chainable by default.
    mockDb.mockImplementation(() => createChainableMock([{ id: 'advisor-123', role: 'advisor', isActive: true }]));
  });

  describe('GET /bloomberg/assets/:symbol/snapshot', () => {
    it('debería retornar snapshot exitosamente', async () => {
      const mockInstrument = { id: 'inst-123', symbol: 'AAPL', name: 'Apple Inc.' };
      const mockPrice = {
        date: '2024-01-01',
        open: '150.00',
        high: '155.00',
        low: '149.00',
        close: '152.00',
        volume: 1000000,
        currency: 'USD',
        source: 'bloomberg',
        asof: new Date(),
      };
      const mockPrevPrice = { close: '150.00' };

      // Use sequential mock implementation to handle all calls
      let callCount = 0;
      mockDb.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createChainableMock([mockInstrument]); // Get instrument
        if (callCount === 2) return createChainableMock([mockPrice]); // Get latest price
        if (callCount === 3) return createChainableMock([mockPrevPrice]); // Get prev close
        if (callCount === 4) return createChainableMock([{ high: '160.00', low: '140.00' }]); // Get 52w high/low
        return createChainableMock([]);
      });

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .get('/bloomberg/assets/AAPL/snapshot')
        .set('Authorization', `Bearer ${advisorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.symbol).toBe('AAPL');
      expect(res.body.data.price).toBe(152);
    });

    it('debería retornar 404 cuando instrument no existe', async () => {
      mockDb.mockReturnValueOnce(createChainableMock([]));

      const app = createTestAppWithRoutes();
      await request(app)
        .get('/bloomberg/assets/INVALID/snapshot')
        .set('Authorization', `Bearer ${advisorToken}`)
        .expect(404);
    });

    it('debería retornar datos parciales cuando no hay price data', async () => {
      const mockInstrument = { id: 'inst-123', symbol: 'AAPL' };

      mockDb
        .mockReturnValueOnce(createChainableMock([mockInstrument]))
        .mockReturnValueOnce(createChainableMock([]));

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .get('/bloomberg/assets/AAPL/snapshot')
        .set('Authorization', `Bearer ${advisorToken}`)
        .expect(200);
      
      expect(res.body.data.price).toBeNull();
      expect(res.body.data.symbol).toBe('AAPL');
    });
  });

  describe('GET /bloomberg/assets/:symbol/ohlcv', () => {
    it('debería retornar OHLCV data exitosamente', async () => {
      const mockInstrument = { id: 'inst-123', symbol: 'AAPL' };
      const mockOHLCV = [
        { date: '2024-01-01', open: '150.00', high: '155.00', low: '149.00', close: '152.00', volume: 1000000 },
      ];

      mockDb
        .mockReturnValueOnce(createChainableMock([mockInstrument]))
        .mockReturnValueOnce(createChainableMock(mockOHLCV));

      const app = createTestAppWithRoutes();
      const res = await request(app)
        .get('/bloomberg/assets/AAPL/ohlcv?timeframe=1d')
        .set('Authorization', `Bearer ${advisorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.data).toHaveLength(1);
    });

    it('debería validar timeframe', async () => {
      const app = createTestAppWithRoutes();
      await request(app)
        .get('/bloomberg/assets/AAPL/ohlcv?timeframe=invalid')
        .set('Authorization', `Bearer ${advisorToken}`)
        .expect(400);
    });
  });
});
