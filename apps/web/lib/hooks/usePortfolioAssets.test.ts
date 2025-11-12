/**
 * Tests para usePortfolioAssets hook
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePortfolioAssets } from './usePortfolioAssets';
import type { Portfolio } from '@/types';

describe('usePortfolioAssets', () => {
  it('debería extraer assets de portfolios', () => {
    const portfolios: Portfolio[] = [
      {
        id: 'portfolio-1',
        name: 'Portfolio 1',
        lines: [
          {
            id: 'line-1',
            targetType: 'instrument',
            instrumentSymbol: 'AAPL',
            instrumentName: 'Apple Inc.',
            instrumentId: 'inst-1',
            targetWeight: 0.5
          },
          {
            id: 'line-2',
            targetType: 'instrument',
            instrumentSymbol: 'GOOGL',
            instrumentName: 'Alphabet Inc.',
            instrumentId: 'inst-2',
            targetWeight: 0.5
          }
        ]
      } as Portfolio
    ];

    const { result } = renderHook(() => usePortfolioAssets(portfolios));

    expect(result.current).toHaveLength(2);
    expect(result.current[0].symbol).toBe('AAPL');
    expect(result.current[1].symbol).toBe('GOOGL');
  });

  it('debería agrupar assets duplicados', () => {
    const portfolios: Portfolio[] = [
      {
        id: 'portfolio-1',
        name: 'Portfolio 1',
        lines: [
          {
            id: 'line-1',
            targetType: 'instrument',
            instrumentSymbol: 'AAPL',
            instrumentId: 'inst-1',
            targetWeight: 0.5
          }
        ]
      } as Portfolio,
      {
        id: 'portfolio-2',
        name: 'Portfolio 2',
        lines: [
          {
            id: 'line-2',
            targetType: 'instrument',
            instrumentSymbol: 'AAPL',
            instrumentId: 'inst-1',
            targetWeight: 0.3
          }
        ]
      } as Portfolio
    ];

    const { result } = renderHook(() => usePortfolioAssets(portfolios));

    expect(result.current).toHaveLength(1);
    expect(result.current[0].symbol).toBe('AAPL');
    expect(result.current[0].portfolios).toEqual(['portfolio-1', 'portfolio-2']);
    expect(result.current[0].totalWeight).toBe(0.8);
  });

  it('debería ignorar líneas que no son instrumentos', () => {
    const portfolios: Portfolio[] = [
      {
        id: 'portfolio-1',
        name: 'Portfolio 1',
        lines: [
          {
            id: 'line-1',
            targetType: 'assetClass',
            assetClass: 'stocks',
            targetWeight: 0.5
          }
        ]
      } as Portfolio
    ];

    const { result } = renderHook(() => usePortfolioAssets(portfolios));

    expect(result.current).toHaveLength(0);
  });

  it('debería retornar array vacío cuando no hay portfolios', () => {
    const { result } = renderHook(() => usePortfolioAssets([]));

    expect(result.current).toHaveLength(0);
  });
});



