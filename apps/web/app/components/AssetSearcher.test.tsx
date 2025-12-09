/**
 * Tests for AssetSearcher Component
 *
 * Covers:
 * - Rendering with default props
 * - Search functionality with debounce
 * - Error handling
 * - Direct symbol validation
 * - Asset selection
 * - User authentication checks
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AssetSearcher from './AssetSearcher';
import { useAuth } from '../auth/AuthContext';
import * as apiModule from '@/lib/api';
import { logger } from '@/lib/logger';

// Mock dependencies
vi.mock('../auth/AuthContext');
vi.mock('@/lib/api', () => ({
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
  });

  afterEach(() => {
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

    it('should show direct symbol button when query has text', () => {
      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      fireEvent.change(input, { target: { value: 'AAPL' } });

      expect(screen.getByTitle('Agregar símbolo directo')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should not search if query is less than 2 characters', async () => {
      const searchInstrumentsSpy = vi.spyOn(apiModule, 'searchInstruments');

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      fireEvent.change(input, { target: { value: 'A' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(searchInstrumentsSpy).not.toHaveBeenCalled();
      });
    });

    it('should search after debounce delay', async () => {
      const searchInstrumentsSpy = vi.spyOn(apiModule, 'searchInstruments').mockResolvedValue({
        success: true,
        data: [],
      });

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      fireEvent.change(input, { target: { value: 'AAPL' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(searchInstrumentsSpy).toHaveBeenCalledWith('AAPL');
      });
    });

    it('should cancel previous search when typing quickly', async () => {
      const searchInstrumentsSpy = vi.spyOn(apiModule, 'searchInstruments').mockResolvedValue({
        success: true,
        data: [],
      });

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      fireEvent.change(input, { target: { value: 'AA' } });
      vi.advanceTimersByTime(200);

      fireEvent.change(input, { target: { value: 'AAPL' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(searchInstrumentsSpy).toHaveBeenCalledTimes(1);
        expect(searchInstrumentsSpy).toHaveBeenCalledWith('AAPL');
      });
    });

    it('should display search results', async () => {
      const mockResults = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          currency: 'USD',
          type: 'EQUITY',
        },
        {
          symbol: 'MSFT',
          name: 'Microsoft Corporation',
          currency: 'USD',
          type: 'EQUITY',
        },
      ];

      vi.spyOn(apiModule, 'searchInstruments').mockResolvedValue({
        success: true,
        data: mockResults,
      });

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      fireEvent.change(input, { target: { value: 'AAPL' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
        expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
        expect(screen.getByText('MSFT')).toBeInTheDocument();
      });
    });

    it('should show loading state during search', async () => {
      vi.spyOn(apiModule, 'searchInstruments').mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true, data: [] }), 100))
      );

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      fireEvent.change(input, { target: { value: 'AAPL' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText(/buscando activos/i)).toBeInTheDocument();
      });
    });

    it('should show no results message when no results found', async () => {
      vi.spyOn(apiModule, 'searchInstruments').mockResolvedValue({
        success: true,
        data: [],
      });

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      fireEvent.change(input, { target: { value: 'XYZ' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText(/no se encontraron resultados/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error when user is not authenticated', async () => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: null,
      });

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      fireEvent.change(input, { target: { value: 'AAPL' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText(/debes iniciar sesión/i)).toBeInTheDocument();
      });
    });

    it('should handle 503 service unavailable error', async () => {
      vi.spyOn(apiModule, 'searchInstruments').mockResolvedValue({
        success: false,
        error: 'Service temporarily unavailable',
        status: 503,
      });

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      fireEvent.change(input, { target: { value: 'AAPL' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(
          screen.getByText(/servicio de búsqueda externa no está disponible/i)
        ).toBeInTheDocument();
      });
    });

    it('should handle 504 timeout error', async () => {
      const error = new Error('Gateway Timeout');
      (error as any).status = 504;

      vi.spyOn(apiModule, 'searchInstruments').mockRejectedValue(error);

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      fireEvent.change(input, { target: { value: 'AAPL' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText(/está tardando demasiado/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      const error = new Error('Failed to fetch');
      vi.spyOn(apiModule, 'searchInstruments').mockRejectedValue(error);

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      fireEvent.change(input, { target: { value: 'AAPL' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText(/no se pudo conectar/i)).toBeInTheDocument();
      });
    });

    it('should log errors to logger', async () => {
      const error = new Error('Test error');
      vi.spyOn(apiModule, 'searchInstruments').mockRejectedValue(error);

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      fireEvent.change(input, { target: { value: 'AAPL' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalled();
      });
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

      vi.spyOn(apiModule, 'searchInstruments').mockResolvedValue({
        success: true,
        data: mockResults,
      });

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      fireEvent.change(input, { target: { value: 'AAPL' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });

      const assetItem = screen.getByText('AAPL').closest('div');
      if (assetItem) {
        fireEvent.click(assetItem);
      }

      expect(mockOnAssetSelect).toHaveBeenCalledWith({
        id: 'AAPL',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        currency: 'USD',
        type: 'EQUITY',
      });
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

      vi.spyOn(apiModule, 'searchInstruments').mockResolvedValue({
        success: true,
        data: mockResults,
      });

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i) as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'AAPL' } });
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });

      const assetItem = screen.getByText('AAPL').closest('div');
      if (assetItem) {
        fireEvent.click(assetItem);
      }

      expect(input.value).toBe('');
      expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
    });
  });

  describe('Direct Symbol Validation', () => {
    it('should validate and add symbol directly when valid', async () => {
      vi.spyOn(apiModule, 'validateSymbol').mockResolvedValue({
        success: true,
        data: {
          isValid: true,
          symbol: 'AAPL',
        },
      });

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      fireEvent.change(input, { target: { value: 'AAPL' } });

      const directSymbolButton = screen.getByTitle('Agregar símbolo directo');
      fireEvent.click(directSymbolButton);

      await waitFor(() => {
        expect(mockOnAssetSelect).toHaveBeenCalledWith({
          id: 'AAPL',
          symbol: 'AAPL',
          name: 'AAPL',
          currency: 'USD',
          type: 'EQUITY',
        });
      });
    });

    it('should add symbol even if validation fails', async () => {
      vi.spyOn(apiModule, 'validateSymbol').mockResolvedValue({
        success: true,
        data: {
          isValid: false,
          symbol: 'INVALID',
        },
      });

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      fireEvent.change(input, { target: { value: 'INVALID' } });

      const directSymbolButton = screen.getByTitle('Agregar símbolo directo');
      fireEvent.click(directSymbolButton);

      await waitFor(
        () => {
          expect(mockOnAssetSelect).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );
    });

    it('should handle validation errors gracefully', async () => {
      const error = new Error('Validation error');
      vi.spyOn(apiModule, 'validateSymbol').mockRejectedValue(error);

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      fireEvent.change(input, { target: { value: 'TEST' } });

      const directSymbolButton = screen.getByTitle('Agregar símbolo directo');
      fireEvent.click(directSymbolButton);

      await waitFor(
        () => {
          expect(mockOnAssetSelect).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );
    });

    it('should not add symbol if user is not authenticated', async () => {
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: null,
      });

      render(<AssetSearcher onAssetSelect={mockOnAssetSelect} />);
      const input = screen.getByPlaceholderText(/buscar por símbolo o nombre/i);

      fireEvent.change(input, { target: { value: 'AAPL' } });

      const directSymbolButton = screen.getByTitle('Agregar símbolo directo');
      fireEvent.click(directSymbolButton);

      await waitFor(() => {
        expect(mockOnAssetSelect).not.toHaveBeenCalled();
      });
    });
  });
});
