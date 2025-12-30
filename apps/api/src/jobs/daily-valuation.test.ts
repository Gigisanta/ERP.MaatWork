/**
 * Tests para daily-valuation job
 *
 * AI_DECISION: Tests unitarios para job de valuación diaria
 * Justificación: Validación crítica de cálculos financieros
 * Impacto: Prevenir errores en valuación de carteras
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DailyValuationJob, runDailyValuationJob, runPriceBackfillJob } from './daily-valuation';
import { db, instruments, priceSnapshots, brokerPositions, aumSnapshots } from '@maatwork/db';

// Mock dependencies
vi.mock('@maatwork/db', async () => {
  const actual = await vi.importActual('@maatwork/db');
  return {
    ...actual,
    db: vi.fn(),
    instruments: {
      id: 'instruments_id',
      symbol: 'instruments_symbol',
      active: 'instruments_active',
      currency: 'instruments_currency',
      name: 'instruments_name',
    },
    priceSnapshots: {
      instrumentId: 'priceSnapshots_instrumentId',
      closePrice: 'priceSnapshots_closePrice',
      currency: 'priceSnapshots_currency',
      asOfDate: 'priceSnapshots_asOfDate',
      source: 'priceSnapshots_source',
    },
    brokerPositions: {
      marketValue: 'brokerPositions_marketValue',
      brokerAccountId: 'brokerPositions_brokerAccountId',
      instrumentId: 'brokerPositions_instrumentId',
      asOfDate: 'brokerPositions_asOfDate',
    },
    aumSnapshots: {
      contactId: 'aumSnapshots_contactId',
      date: 'aumSnapshots_date',
      aumTotal: 'aumSnapshots_aumTotal',
    },
  };
});

vi.mock('@maatwork/db/schema', async () => {
  const actual = await vi.importActual('@maatwork/db/schema');
  return {
    ...actual,
    instruments: {
      id: 'instruments_id',
      symbol: 'instruments_symbol',
      active: 'instruments_active',
      currency: 'instruments_currency',
      name: 'instruments_name',
    },
    priceSnapshots: {
      instrumentId: 'priceSnapshots_instrumentId',
      closePrice: 'priceSnapshots_closePrice',
      currency: 'priceSnapshots_currency',
      asOfDate: 'priceSnapshots_asOfDate',
      source: 'priceSnapshots_source',
    },
    brokerPositions: {
      marketValue: 'brokerPositions_marketValue',
      brokerAccountId: 'brokerPositions_brokerAccountId',
      instrumentId: 'brokerPositions_instrumentId',
      asOfDate: 'brokerPositions_asOfDate',
    },
    brokerBalances: { contactId: 'brokerBalances_contactId' },
    brokerAccounts: { id: 'brokerAccounts_id', contactId: 'brokerAccounts_contactId' },
    aumSnapshots: {
      contactId: 'aumSnapshots_contactId',
      date: 'aumSnapshots_date',
      aumTotal: 'aumSnapshots_aumTotal',
    },
    clientPortfolioAssignments: {
      contactId: 'clientPortfolioAssignments_contactId',
      templateId: 'clientPortfolioAssignments_templateId',
      id: 'clientPortfolioAssignments_id',
      status: 'clientPortfolioAssignments_status',
      startDate: 'clientPortfolioAssignments_startDate',
      endDate: 'clientPortfolioAssignments_endDate',
    },
    portfolioMonitoringSnapshot: {
      id: 'portfolioMonitoringSnapshot_id',
      contactId: 'portfolioMonitoringSnapshot_contactId',
      asOfDate: 'portfolioMonitoringSnapshot_asOfDate',
      totalDeviationPct: 'portfolioMonitoringSnapshot_totalDeviationPct',
    },
    portfolioMonitoringDetails: { snapshotId: 'portfolioMonitoringDetails_snapshotId' },
    portfolioTemplateLines: {
      templateId: 'portfolioTemplateLines_templateId',
      targetType: 'portfolioTemplateLines_targetType',
      assetClass: 'portfolioTemplateLines_assetClass',
      instrumentId: 'portfolioTemplateLines_instrumentId',
      targetWeight: 'portfolioTemplateLines_targetWeight',
    },
    contacts: { id: 'contacts_id' },
  };
});

vi.mock('drizzle-orm', async () => {
  const actual = await vi.importActual('drizzle-orm');
  return {
    ...actual,
    eq: vi.fn(() => ({})),
    and: vi.fn(() => ({})),
    desc: vi.fn(() => ({})),
    lte: vi.fn(() => ({})),
    sql: Object.assign(
      (strings: TemplateStringsArray, ...values: unknown[]) => ({
        sql: strings.join('?'),
        values,
        as: vi.fn((alias: string) => ({ sql: strings.join('?'), values, alias })),
      }),
      {
        raw: vi.fn((str: string) => ({
          sql: str,
          values: [],
          as: vi.fn((alias: string) => ({ sql: str, values: [], alias })),
        })),
      }
    ),
    sum: vi.fn(() => ({})),
  };
});

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockDb = vi.mocked(db);

// Helper to create a chainable mock
const createChainableMock = (finalValue: unknown) => {
  const mock = vi.fn().mockImplementation(() => mock) as any;

  // Drizzle common methods
  mock.select = vi.fn().mockReturnValue(mock);
  mock.from = vi.fn().mockReturnValue(mock);
  mock.where = vi.fn().mockReturnValue(mock);
  mock.orderBy = vi.fn().mockReturnValue(mock);
  mock.limit = vi.fn().mockReturnValue(mock);
  mock.offset = vi.fn().mockReturnValue(mock);
  mock.innerJoin = vi.fn().mockReturnValue(mock);
  mock.leftJoin = vi.fn().mockReturnValue(mock);
  mock.groupBy = vi.fn().mockReturnValue(mock);
  mock.insert = vi.fn().mockReturnValue(mock);
  mock.values = vi.fn().mockReturnValue(mock);
  mock.onConflictDoUpdate = vi.fn().mockReturnValue(mock);
  mock.onConflictDoNothing = vi.fn().mockReturnValue(mock);
  mock.update = vi.fn().mockReturnValue(mock);
  mock.set = vi.fn().mockReturnValue(mock);
  mock.delete = vi.fn().mockReturnValue(mock);
  mock.returning = vi.fn().mockReturnValue(mock);

  // The terminal method returns the promise
  mock.then = (onRes: (value: unknown) => void, onRej: (reason: unknown) => void) =>
    Promise.resolve(finalValue).then(onRes, onRej);

  return mock as unknown as ReturnType<typeof db>;
};

describe('DailyValuationJob', () => {
  let job: DailyValuationJob;

  beforeEach(() => {
    job = new DailyValuationJob();
    vi.clearAllMocks();
  });

  describe('run', () => {
    it('debería ejecutar job completo exitosamente', async () => {
      const mockInstruments = [{ id: 'inst-1', symbol: 'AAPL', name: 'Apple', currency: 'USD' }];
      const mockPrices = {
        AAPL: {
          price: 150.0,
          currency: 'USD',
          date: '2024-01-01',
          source: 'yfinance',
          success: true,
        },
      };

      mockDb.mockImplementation(() =>
        createChainableMock([
          { id: 'inst-1', symbol: 'AAPL', name: 'Apple', currency: 'USD' },
          { contactId: 'c1', aumTotal: '1000', templateId: 't1', assignmentId: 'a1' },
          { targetType: 'asset_class', assetClass: 'Equities', targetWeight: '0.5' },
        ])
      );

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: mockPrices,
        }),
      });

      await expect(job.run()).resolves.not.toThrow();
    });

    it('debería manejar cuando no hay instrumentos activos', async () => {
      mockDb.mockImplementation(() => createChainableMock([]));

      await expect(job.run()).resolves.not.toThrow();
    });
  });

  describe('getActiveInstruments', () => {
    it('debería obtener instrumentos activos', async () => {
      const mockInstruments = [{ id: 'inst-1', symbol: 'AAPL', name: 'Apple', currency: 'USD' }];
      mockDb.mockReturnValue(createChainableMock(mockInstruments));

      const result = await (job as any).getActiveInstruments();
      expect(result).toEqual(mockInstruments);
    });
  });

  describe('fetchCurrentPrices', () => {
    it('debería obtener precios del servicio Python', async () => {
      const instrumentsList = [{ id: 'inst-1', symbol: 'AAPL', name: 'Apple', currency: 'USD' }];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            AAPL: {
              price: 150.0,
              currency: 'USD',
              date: '2024-01-01',
              source: 'yfinance',
              success: true,
            },
          },
        }),
      });

      const result = await (job as any).fetchCurrentPrices(instrumentsList);

      expect(result).toBeDefined();
      expect(result?.AAPL?.price).toBe(150.0);
    });

    it('debería usar fallback cuando el servicio falla', async () => {
      const instrumentsList = [{ id: 'inst-1', symbol: 'AAPL', name: 'Apple', currency: 'USD' }];

      mockFetch.mockRejectedValue(new Error('Service error'));

      const mockFallbackPrices = [
        {
          instrumentId: 'inst-1',
          symbol: 'AAPL',
          closePrice: '150.00',
          currency: 'USD',
          asOfDate: new Date(),
        },
      ];

      mockDb.mockReturnValue(createChainableMock(mockFallbackPrices));

      const result = await (job as any).fetchCurrentPrices(instrumentsList);

      expect(result).toBeDefined();
    });
  });

  describe('calculateAUMByContact', () => {
    it('debería calcular AUM por contacto', async () => {
      const date = '2024-01-01';
      const mockPositions = [
        {
          contactId: 'contact-1',
          aumTotal: '1500.00',
        },
      ];

      mockDb
        .mockReturnValueOnce(createChainableMock(mockPositions)) // select
        .mockReturnValueOnce(createChainableMock([])); // insert

      await expect((job as any).calculateAUMByContact(date)).resolves.not.toThrow();
    });
  });
});

describe('runDailyValuationJob', () => {
  it('debería ejecutar job', async () => {
    const mockRun = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(DailyValuationJob.prototype, 'run').mockImplementation(mockRun);

    await runDailyValuationJob();

    expect(mockRun).toHaveBeenCalledOnce();
  });
});

describe('runPriceBackfillJob', () => {
  it('debería ejecutar backfill de precios', async () => {
    const mockInstruments = [{ id: 'inst-1', symbol: 'AAPL', name: 'Apple', currency: 'USD' }];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        total_records: 100,
        symbols_count: 1,
        data: {
          AAPL: [{ date: '2024-01-01', price: 150.0, currency: 'USD' }],
        },
      }),
    });

    mockDb
      .mockReturnValueOnce(createChainableMock(mockInstruments)) // getActiveInstruments
      .mockReturnValueOnce(createChainableMock([])); // insert in loop

    await expect(runPriceBackfillJob(365)).resolves.not.toThrow();
  });
});
