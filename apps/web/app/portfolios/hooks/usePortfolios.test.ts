/**
 * Tests para usePortfolios hook
 *
 * AI_DECISION: Tests para hook de gestión de portfolios
 * Justificación: Validar fetching, creación, actualización y eliminación de portfolios
 * Impacto: Prevenir errores en gestión de carteras
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePortfolios } from './usePortfolios';

// Mock dependencies
vi.mock('./useEntityWithComponents', () => ({
  useEntityWithComponents: vi.fn(),
}));

describe('usePortfolios', () => {
  const mockUseEntityWithComponents = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    const { useEntityWithComponents } = require('./useEntityWithComponents');
    useEntityWithComponents.mockImplementation(mockUseEntityWithComponents);
  });

  it('debería retornar portfolios y funciones de gestión', () => {
    mockUseEntityWithComponents.mockReturnValue({
      entities: [{ id: 'port-1', name: 'Portfolio 1', riskLevel: 'moderate' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      createEntity: vi.fn(),
      updateEntity: vi.fn(),
      deleteEntity: vi.fn(),
    });

    const { result } = renderHook(() => usePortfolios());

    expect(result.current.portfolios).toBeDefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.createPortfolio).toBeDefined();
    expect(result.current.updatePortfolio).toBeDefined();
    expect(result.current.deletePortfolio).toBeDefined();
  });

  it('debería pasar configuración correcta a useEntityWithComponents', () => {
    const {
      getPortfolios,
      getPortfolioLinesBatch,
      createPortfolio,
      updatePortfolio,
      deletePortfolio,
    } = require('@/lib/api');

    mockUseEntityWithComponents.mockReturnValue({
      entities: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      createEntity: vi.fn(),
      updateEntity: vi.fn(),
      deleteEntity: vi.fn(),
    });

    renderHook(() => usePortfolios());

    expect(mockUseEntityWithComponents).toHaveBeenCalledWith(
      expect.objectContaining({
        fetchEntities: getPortfolios,
        fetchComponentsBatch: getPortfolioLinesBatch,
        createEntity: createPortfolio,
        updateEntity: updatePortfolio,
        deleteEntity: deletePortfolio,
        entityName: 'portfolios',
      })
    );
  });

  it('debería retornar loading state', () => {
    mockUseEntityWithComponents.mockReturnValue({
      entities: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
      createEntity: vi.fn(),
      updateEntity: vi.fn(),
      deleteEntity: vi.fn(),
    });

    const { result } = renderHook(() => usePortfolios());

    expect(result.current.isLoading).toBe(true);
  });

  it('debería retornar error state', () => {
    mockUseEntityWithComponents.mockReturnValue({
      entities: [],
      isLoading: false,
      error: 'Failed to fetch',
      refetch: vi.fn(),
      createEntity: vi.fn(),
      updateEntity: vi.fn(),
      deleteEntity: vi.fn(),
    });

    const { result } = renderHook(() => usePortfolios());

    expect(result.current.error).toBe('Failed to fetch');
  });

  it('debería convertir entities a portfolios', () => {
    const mockPortfolios = [
      { id: 'port-1', name: 'Portfolio 1', riskLevel: 'moderate' },
      { id: 'port-2', name: 'Portfolio 2', riskLevel: 'aggressive' },
    ];

    mockUseEntityWithComponents.mockReturnValue({
      entities: mockPortfolios,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      createEntity: vi.fn(),
      updateEntity: vi.fn(),
      deleteEntity: vi.fn(),
    });

    const { result } = renderHook(() => usePortfolios());

    expect(result.current.portfolios).toEqual(mockPortfolios);
    expect(result.current.portfolios.length).toBe(2);
  });
});
