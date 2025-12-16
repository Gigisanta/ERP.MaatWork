/**
 * Tests para daily-valuation job
 *
 * AI_DECISION: Tests unitarios para job de valuación diaria
 * Justificación: Validación crítica de cálculos financieros
 * Impacto: Prevenir errores en valuación de carteras
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DailyValuationJob, runDailyValuationJob, runPriceBackfillJob } from './daily-valuation';
import { db, instruments, priceSnapshots, brokerPositions, aumSnapshots } from '@cactus/db';
import axios from 'axios';

// Mock dependencies
vi.mock('@cactus/db', async () => {
  const actual = await vi.importActual('@cactus/db');
  return {
    ...actual,
    db: vi.fn(),
    instruments: {},
    priceSnapshots: {},
    brokerPositions: {},
    aumSnapshots: {},
    eq: vi.fn(),
    and: vi.fn(),
    sql: vi.fn(),
    desc: vi.fn(),
    lte: vi.fn(),
  };
});

vi.mock('@cactus/db/schema', async () => {
  const actual = await vi.importActual('@cactus/db/schema');
  return {
    ...actual,
    instruments: {},
    priceSnapshots: {},
    brokerPositions: {},
    brokerBalances: {},
    brokerAccounts: {},
    aumSnapshots: {},
    clientPortfolioAssignments: {},
    portfolioMonitoringSnapshot: {},
    portfolioMonitoringDetails: {},
    portfolioTemplateLines: {},
    contacts: {},
  };
});

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}));

const mockDb = vi.mocked(db);
const mockAxios = vi.mocked(axios);

describe('DailyValuationJob', () => {
  let job: DailyValuationJob;

  beforeEach(() => {
    job = new DailyValuationJob();
    vi.clearAllMocks();
  });

  describe('run', () => {
    it('debería ejecutar job completo exitosamente', async () => {
      const mockInstruments = [{ id: 'inst-1', symbol: 'AAPL', name: 'Apple', currency: 'USD' }];

      const mockSelect = vi.fn().mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockInstruments),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      mockAxios.post.mockResolvedValue({
        data: {
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
        },
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([]),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      } as any);

      await expect(job.run()).resolves.not.toThrow();
    });

    it('debería manejar cuando no hay instrumentos activos', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      await expect(job.run()).resolves.not.toThrow();
    });
  });

  describe('getActiveInstruments', () => {
    it('debería obtener instrumentos activos', async () => {
      const mockInstruments = [{ id: 'inst-1', symbol: 'AAPL', name: 'Apple', currency: 'USD' }];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockInstruments),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await (job as any).getActiveInstruments();
      expect(result).toEqual(mockInstruments);
    });
  });

  describe('fetchCurrentPrices', () => {
    it('debería obtener precios del servicio Python', async () => {
      const instrumentsList = [{ id: 'inst-1', symbol: 'AAPL', name: 'Apple', currency: 'USD' }];

      mockAxios.post.mockResolvedValue({
        data: {
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
        },
      });

      const result = await (job as any).fetchCurrentPrices(instrumentsList);

      expect(result).toBeDefined();
      expect(result?.AAPL?.price).toBe(150.0);
    });

    it('debería usar fallback cuando el servicio falla', async () => {
      const instrumentsList = [{ id: 'inst-1', symbol: 'AAPL', name: 'Apple', currency: 'USD' }];

      mockAxios.post.mockRejectedValue(new Error('Service error'));

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([
                {
                  instrumentId: 'inst-1',
                  symbol: 'AAPL',
                  closePrice: '150.00',
                  currency: 'USD',
                  asOfDate: new Date(),
                },
              ]),
            }),
          }),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
      } as any);

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
          instrumentId: 'inst-1',
          quantity: '10',
          marketValue: '1500.00',
          symbol: 'AAPL',
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockPositions),
          }),
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue([]),
        }),
      });

      mockDb.mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      } as any);

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

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(mockInstruments),
      }),
    });

    mockAxios.post.mockResolvedValue({
      data: {
        success: true,
        total_records: 100,
        symbols_count: 1,
        data: {
          AAPL: [{ date: '2024-01-01', close_price: 150.0, currency: 'USD' }],
        },
      },
    });

    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue([]),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    } as any);

    await expect(runPriceBackfillJob(365)).resolves.not.toThrow();
  });
});
