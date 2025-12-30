/**
 * Tests for AssetSearcher Component
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import AssetSearcher from './AssetSearcher';
import { useAuth } from '../auth/AuthContext';
import { logger } from '@/lib/logger';
import { searchInstruments, validateSymbol } from '@/lib/api/instruments';

// Mock dependencies
vi.mock('../auth/AuthContext');
vi.mock('@/lib/api/instruments', () => ({
  searchInstruments: vi.fn(),
  validateSymbol: vi.fn(),
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

describe('AssetSearcher', () => {
  const mockOnAssetSelect = vi.fn();
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    role: 'advisor' as const,
    fullName: 'Test User',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockUser,
    });
    // Default successful empty response
    (searchInstruments as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: [],
    });
    (validateSymbol as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { isValid: true, symbol: 'AAPL' },
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render with default placeholder', () => {
      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);
      expect(input).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} placeholder="Custom placeholder" />);
      const input = screen.getByPlaceholderText('Custom placeholder');
      expect(input).toBeInTheDocument();
    });

    it('should show direct symbol button when query has text', async () => {
      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      await act(async () => {
        fireEvent.change(input, { target: { value: 'AAPL' } });
      });

      expect(screen.getByTitle('Agregar símbolo directo')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should not search if query is less than 2 characters', async () => {
      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      await act(async () => {
        fireEvent.change(input, { target: { value: 'A' } });
        await vi.advanceTimersByTimeAsync(300);
      });

      expect(searchInstruments).not.toHaveBeenCalled();
    });

    it('should search after debounce delay', async () => {
      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      await act(async () => {
        fireEvent.change(input, { target: { value: 'AAPL' } });
        await vi.advanceTimersByTimeAsync(300);
      });

      expect(searchInstruments).toHaveBeenCalledWith('AAPL');
    });

    it('should cancel previous search when typing quickly', async () => {
      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      await act(async () => {
        fireEvent.change(input, { target: { value: 'AA' } });
        await vi.advanceTimersByTimeAsync(200);
        fireEvent.change(input, { target: { value: 'AAPL' } });
        await vi.advanceTimersByTimeAsync(300);
      });

      expect(searchInstruments).toHaveBeenCalledTimes(1);
      expect(searchInstruments).toHaveBeenCalledWith('AAPL');
    });

    it('should display search results', async () => {
      const mockResults = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          currency: 'USD',
          type: 'EQUITY',
        },
      ];

      (searchInstruments as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: mockResults,
      });

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      await act(async () => {
        fireEvent.change(input, { target: { value: 'AAPL' } });
        await vi.advanceTimersByTimeAsync(300);
      });

      // Instead of findByText which polls and gets stuck with fake timers
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    });

    it('should show loading state during search', async () => {
      let resolveSearch: (value: unknown) => void;
      const searchPromise = new Promise((resolve) => {
        resolveSearch = resolve;
      });
      (searchInstruments as ReturnType<typeof vi.fn>).mockReturnValue(searchPromise);

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      await act(async () => {
        fireEvent.change(input, { target: { value: 'AAPL' } });
      });

      // Advance to trigger search but don't resolve promise yet
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      expect(screen.getByText(/buscando activos/i)).toBeInTheDocument();

      await act(async () => {
        resolveSearch({ success: true, data: [] });
        await searchPromise;
      });

      expect(screen.queryByText(/buscando activos/i)).not.toBeInTheDocument();
    });

    it('should show no results message when no results found', async () => {
      (searchInstruments as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: [],
      });

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      await act(async () => {
        fireEvent.change(input, { target: { value: 'XYZ' } });
        await vi.advanceTimersByTimeAsync(300);
      });

      expect(screen.getByText(/no se encontraron resultados/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show error when user is not authenticated', async () => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: null,
      });

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      await act(async () => {
        fireEvent.change(input, { target: { value: 'AAPL' } });
        await vi.advanceTimersByTimeAsync(300);
      });

      expect(screen.getByText(/debes iniciar sesión para buscar activos/i)).toBeInTheDocument();
    });

    it('should handle 503 service unavailable error', async () => {
      (searchInstruments as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Service temporarily unavailable',
        status: 503,
      });

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      await act(async () => {
        fireEvent.change(input, { target: { value: 'AAPL' } });
        await vi.advanceTimersByTimeAsync(300);
      });

      expect(
        screen.getByText(/servicio de búsqueda externa no está disponible/i)
      ).toBeInTheDocument();
    });

    it('should handle 504 timeout error', async () => {
      const error = new Error('Gateway Timeout');
      (error as unknown as { status: number }).status = 504;
      (searchInstruments as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      await act(async () => {
        fireEvent.change(input, { target: { value: 'AAPL' } });
        await vi.advanceTimersByTimeAsync(300);
      });

      expect(screen.getByText(/está tardando demasiado/i)).toBeInTheDocument();
    });

    it('should handle network errors', async () => {
      const error = new Error('Failed to fetch');
      (searchInstruments as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      await act(async () => {
        fireEvent.change(input, { target: { value: 'AAPL' } });
        await vi.advanceTimersByTimeAsync(300);
      });

      expect(screen.getByText(/no se pudo conectar/i)).toBeInTheDocument();
    });

    it('should log errors to logger', async () => {
      const error = new Error('Test error');
      (searchInstruments as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      await act(async () => {
        fireEvent.change(input, { target: { value: 'AAPL' } });
        await vi.advanceTimersByTimeAsync(300);
      });

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Asset Selection', () => {
    it('should call onAssetSelect when asset is clicked', async () => {
      const mockResults = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          currency: 'USD',
          type: 'EQUITY',
        },
      ];

      (searchInstruments as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: mockResults,
      });

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      await act(async () => {
        fireEvent.change(input, { target: { value: 'AAPL' } });
        await vi.advanceTimersByTimeAsync(300);
      });

      const assetItem = screen.getByText('AAPL');
      await act(async () => {
        fireEvent.click(assetItem);
      });

      expect(mockOnAssetSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'AAPL',
          name: 'Apple Inc.',
        })
      );
    });

    it('should clear query and results after selection', async () => {
      const mockResults = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          currency: 'USD',
          type: 'EQUITY',
        },
      ];

      (searchInstruments as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: mockResults,
      });

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i) as HTMLInputElement;

      await act(async () => {
        fireEvent.change(input, { target: { value: 'AAPL' } });
        await vi.advanceTimersByTimeAsync(300);
      });

      const assetItem = screen.getByText('AAPL');
      await act(async () => {
        fireEvent.click(assetItem);
      });

      expect(input.value).toBe('');
      expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
    });
  });

  describe('Direct Symbol Validation', () => {
    it('should validate and add symbol directly when valid', async () => {
      (validateSymbol as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: {
          isValid: true,
          symbol: 'AAPL',
        },
      });

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      await act(async () => {
        fireEvent.change(input, { target: { value: 'AAPL' } });
      });

      const directSymbolButton = screen.getByTitle('Agregar símbolo directo');
      await act(async () => {
        fireEvent.click(directSymbolButton);
      });

      expect(mockOnAssetSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'AAPL',
        })
      );
    });

    it('should add symbol even if validation fails', async () => {
      (validateSymbol as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: {
          isValid: false,
          symbol: 'INVALID',
        },
      });

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      await act(async () => {
        fireEvent.change(input, { target: { value: 'INVALID' } });
      });

      const directSymbolButton = screen.getByTitle('Agregar símbolo directo');
      await act(async () => {
        fireEvent.click(directSymbolButton);
      });

      // Advance 1500ms for the fallback timer in the component
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });

      expect(mockOnAssetSelect).toHaveBeenCalled();
    });

    it('should handle validation errors gracefully', async () => {
      const error = new Error('Validation error');
      (validateSymbol as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      await act(async () => {
        fireEvent.change(input, { target: { value: 'TEST' } });
      });

      const directSymbolButton = screen.getByTitle('Agregar símbolo directo');
      await act(async () => {
        fireEvent.click(directSymbolButton);
      });

      // Advance 1500ms for the fallback timer
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });

      expect(mockOnAssetSelect).toHaveBeenCalled();
    });

    it('should not add symbol if user is not authenticated', async () => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: null,
      });

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      await act(async () => {
        fireEvent.change(input, { target: { value: 'AAPL' } });
      });

      const directSymbolButton = screen.getByTitle('Agregar símbolo directo');
      await act(async () => {
        fireEvent.click(directSymbolButton);
      });

      expect(mockOnAssetSelect).not.toHaveBeenCalled();
    });
  });
});
