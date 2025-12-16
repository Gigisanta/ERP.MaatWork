import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensureInstrumentsExist, syncPortfolioLines } from './portfolio-helpers';
import { createInstrument, getInstruments, addPortfolioLine, deletePortfolioLine } from '@/lib/api';
import { logger } from '@/lib/logger';

vi.mock('@/lib/api', () => ({
  createInstrument: vi.fn(),
  getInstruments: vi.fn(),
  addPortfolioLine: vi.fn(),
  deletePortfolioLine: vi.fn(),
}));

vi.mock('@/lib/logger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/logger')>();
  return {
    ...actual,
    logger: {
      error: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    },
  };
});

describe('portfolio-helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ensureInstrumentsExist', () => {
    it('debería retornar instrumentIds existentes cuando ya están presentes', async () => {
      const lines = [
        { id: 'line-1', instrumentId: 'inst-1', instrumentSymbol: 'AAPL' },
        { id: 'line-2', instrumentId: 'inst-2', instrumentSymbol: 'MSFT' },
      ];

      const result = await ensureInstrumentsExist(lines as any);

      expect(result).toEqual(['inst-1', 'inst-2']);
      expect(createInstrument).not.toHaveBeenCalled();
    });

    it('debería crear instrumentos cuando no existen', async () => {
      const lines = [{ id: 'line-1', instrumentSymbol: 'AAPL' }];

      (createInstrument as any).mockResolvedValue({
        success: true,
        data: { instrument: { id: 'new-inst-1' } },
      });

      const result = await ensureInstrumentsExist(lines as any);

      expect(result).toEqual(['new-inst-1']);
      expect(createInstrument).toHaveBeenCalledWith({
        symbol: 'AAPL',
        backfill_days: 365,
      });
    });

    it('debería buscar instrumento existente si creación falla', async () => {
      const lines = [{ id: 'line-1', instrumentSymbol: 'AAPL' }];

      (createInstrument as any).mockResolvedValue({
        success: false,
      });

      (getInstruments as any).mockResolvedValue({
        success: true,
        data: {
          instruments: [{ id: 'existing-inst', symbol: 'AAPL' }],
        },
      });

      const result = await ensureInstrumentsExist(lines as any);

      expect(result).toEqual(['existing-inst']);
      expect(getInstruments).toHaveBeenCalledWith({ search: 'AAPL' });
    });

    it('debería lanzar error si no se puede crear ni encontrar instrumento', async () => {
      const lines = [{ id: 'line-1', instrumentSymbol: 'INVALID' }];

      (createInstrument as any).mockResolvedValue({
        success: false,
      });

      (getInstruments as any).mockResolvedValue({
        success: true,
        data: { instruments: [] },
      });

      await expect(ensureInstrumentsExist(lines as any)).rejects.toThrow();
    });

    it('debería retornar string vacío cuando no hay instrumentId ni symbol', async () => {
      const lines = [{ id: 'line-1' }];

      const result = await ensureInstrumentsExist(lines as any);

      expect(result).toEqual(['']);
    });

    it('debería manejar múltiples líneas con y sin instrumentos', async () => {
      const lines = [
        { id: 'line-1', instrumentId: 'inst-1', instrumentSymbol: 'AAPL' },
        { id: 'line-2', instrumentSymbol: 'MSFT' },
        { id: 'line-3' },
      ];

      (createInstrument as any).mockResolvedValue({
        success: true,
        data: { instrument: { id: 'new-inst-2' } },
      });

      const result = await ensureInstrumentsExist(lines as any);

      expect(result).toEqual(['inst-1', 'new-inst-2', '']);
    });
  });

  describe('syncPortfolioLines', () => {
    it('debería eliminar líneas que ya no están en newLines', async () => {
      const portfolioId = 'portfolio-1';
      const currentLines = [
        { id: 'line-1', targetWeight: 0.5 },
        { id: 'line-2', targetWeight: 0.3 },
      ];
      const newLines = [{ id: 'line-1', targetWeight: 0.5 }];
      const instrumentIds = ['inst-1'];

      (deletePortfolioLine as any).mockResolvedValue({ success: true });
      (addPortfolioLine as any).mockResolvedValue({ success: true });

      await syncPortfolioLines(portfolioId, currentLines as any, newLines as any, instrumentIds);

      expect(deletePortfolioLine).toHaveBeenCalledWith(portfolioId, 'line-2');
    });

    it('debería agregar nuevas líneas', async () => {
      const portfolioId = 'portfolio-1';
      const currentLines: any[] = [];
      const newLines = [{ id: 'temp-1', targetType: 'instrument', targetWeight: 0.5 }];
      const instrumentIds = ['inst-1'];

      (addPortfolioLine as any).mockResolvedValue({ success: true });

      await syncPortfolioLines(portfolioId, currentLines, newLines as any, instrumentIds);

      expect(addPortfolioLine).toHaveBeenCalledWith(portfolioId, {
        targetType: 'instrument',
        targetWeight: 0.5,
        instrumentId: 'inst-1',
      });
    });

    it('debería actualizar líneas cuando el peso cambia significativamente', async () => {
      const portfolioId = 'portfolio-1';
      const currentLines = [{ id: 'line-1', targetWeight: 0.5 }];
      const newLines = [{ id: 'line-1', targetType: 'instrument', targetWeight: 0.8 }];
      const instrumentIds = ['inst-1'];

      (deletePortfolioLine as any).mockResolvedValue({ success: true });
      (addPortfolioLine as any).mockResolvedValue({ success: true });

      await syncPortfolioLines(portfolioId, currentLines as any, newLines as any, instrumentIds);

      expect(deletePortfolioLine).toHaveBeenCalledWith(portfolioId, 'line-1');
      expect(addPortfolioLine).toHaveBeenCalledWith(portfolioId, {
        targetType: 'instrument',
        targetWeight: 0.8,
        instrumentId: 'inst-1',
      });
    });

    it('debería no actualizar líneas cuando el peso no cambia significativamente', async () => {
      const portfolioId = 'portfolio-1';
      const currentLines = [{ id: 'line-1', targetWeight: 0.5 }];
      const newLines = [{ id: 'line-1', targetType: 'instrument', targetWeight: 0.5001 }];
      const instrumentIds = ['inst-1'];

      await syncPortfolioLines(portfolioId, currentLines as any, newLines as any, instrumentIds);

      expect(deletePortfolioLine).not.toHaveBeenCalled();
      expect(addPortfolioLine).not.toHaveBeenCalled();
    });

    it('debería manejar líneas con assetClass', async () => {
      const portfolioId = 'portfolio-1';
      const currentLines: any[] = [];
      const newLines = [
        { id: 'temp-1', targetType: 'assetClass', targetWeight: 0.3, assetClass: 'equity' },
      ];
      const instrumentIds = [''];

      (addPortfolioLine as any).mockResolvedValue({ success: true });

      await syncPortfolioLines(portfolioId, currentLines, newLines as any, instrumentIds);

      expect(addPortfolioLine).toHaveBeenCalledWith(portfolioId, {
        targetType: 'assetClass',
        targetWeight: 0.3,
        assetClass: 'equity',
      });
    });

    it('debería ignorar líneas temporales al identificar líneas a eliminar', async () => {
      const portfolioId = 'portfolio-1';
      const currentLines = [{ id: 'line-1', targetWeight: 0.5 }];
      const newLines = [{ id: 'temp-1', targetType: 'instrument', targetWeight: 0.3 }];
      const instrumentIds = ['inst-1'];

      (deletePortfolioLine as any).mockResolvedValue({ success: true });
      (addPortfolioLine as any).mockResolvedValue({ success: true });

      await syncPortfolioLines(portfolioId, currentLines as any, newLines as any, instrumentIds);

      expect(deletePortfolioLine).toHaveBeenCalledWith(portfolioId, 'line-1');
    });
  });
});
