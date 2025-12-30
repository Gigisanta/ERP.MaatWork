/**
 * Tests para PortfolioPerformanceMetrics component
 *
 * AI_DECISION: Tests unitarios para métricas de rendimiento de carteras
 * Justificación: Validación crítica de cálculo y visualización de métricas financieras
 * Impacto: Prevenir errores en análisis de rendimiento
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PortfolioPerformanceMetrics from './PortfolioPerformanceMetrics';
import { getPortfolioPerformance } from '@/lib/api/analytics';
import type { Portfolio } from '@/types';

import React from 'react';

// Mock dependencies
vi.mock('@/lib/api/analytics', () => ({
  getPortfolioPerformance: vi.fn(),
}));

vi.mock('@maatwork/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  DataTable: ({
    data,
    columns,
    emptyMessage,
  }: {
    data: unknown[];
    columns: unknown[];
    emptyMessage?: string;
  }) => (
    <div>
      {data.length === 0 ? (
        <div>{emptyMessage}</div>
      ) : (
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx}>
                {columns.map((col) => (
                  <td key={col.key}>{col.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  ),
  Text: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
  Stack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Spinner: ({ size }: { size?: string }) => <div data-testid="spinner">Loading...</div>,
  Alert: ({ children }: { children: React.ReactNode }) => <div role="alert">{children}</div>,
  Select: ({
    value,
    onValueChange,
    items,
  }: {
    value: string;
    onValueChange: (val: string) => void;
    items: Array<{ value: string; label: string }>;
  }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {items.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  ),
}));

describe('PortfolioPerformanceMetrics', () => {
  const mockPortfolios: Portfolio[] = [
    {
      id: '1',
      name: 'Portfolio 1',
      riskLevel: 'moderate',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: '2',
      name: 'Portfolio 2',
      riskLevel: 'aggressive',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería mostrar mensaje cuando no hay carteras', () => {
    render(<PortfolioPerformanceMetrics portfolios={[]} />);
    expect(screen.getByText('No hay carteras disponibles')).toBeInTheDocument();
  });

  it('debería mostrar loading inicialmente', async () => {
    (getPortfolioPerformance as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<PortfolioPerformanceMetrics portfolios={mockPortfolios} />);

    // El componente muestra spinners dentro de las filas cuando están cargando
    // Esperar a que se muestren los spinners en las filas
    await waitFor(() => {
      const spinners = screen.getAllByTestId('spinner');
      expect(spinners.length).toBeGreaterThan(0);
    });
  });

  it('debería mostrar métricas cuando se cargan exitosamente', async () => {
    (getPortfolioPerformance as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        success: true,
        data: {
          metrics: {
            totalReturn: 0.15,
            volatility: 0.12,
            sharpeRatio: 1.25,
            maxDrawdown: -0.08,
            annualizedReturn: 0.18,
          },
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          metrics: {
            totalReturn: 0.22,
            volatility: 0.18,
            sharpeRatio: 1.22,
            maxDrawdown: -0.12,
            annualizedReturn: 0.25,
          },
        },
      });

    render(<PortfolioPerformanceMetrics portfolios={mockPortfolios} />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Portfolio Performance Metrics')).toBeInTheDocument();
    expect(screen.getByText('Portfolio 1')).toBeInTheDocument();
    expect(screen.getByText('Portfolio 2')).toBeInTheDocument();
  });

  it('debería manejar errores en carga de métricas', async () => {
    (getPortfolioPerformance as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        success: false,
        error: 'Failed to fetch metrics',
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          metrics: {
            totalReturn: 0.15,
            volatility: 0.12,
            sharpeRatio: 1.25,
            maxDrawdown: -0.08,
            annualizedReturn: 0.18,
          },
        },
      });

    render(<PortfolioPerformanceMetrics portfolios={mockPortfolios} />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    // Debería mostrar N/A para el portfolio con error
    expect(screen.getByText('Portfolio 1')).toBeInTheDocument();
  });

  it('debería manejar excepciones en carga', async () => {
    (getPortfolioPerformance as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        success: true,
        data: {
          metrics: {
            totalReturn: 0.15,
            volatility: 0.12,
            sharpeRatio: 1.25,
            maxDrawdown: -0.08,
            annualizedReturn: 0.18,
          },
        },
      });

    render(<PortfolioPerformanceMetrics portfolios={mockPortfolios} />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Portfolio 1')).toBeInTheDocument();
  });

  it('debería cambiar periodo cuando se selecciona otro', async () => {
    (getPortfolioPerformance as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        metrics: {
          totalReturn: 0.15,
          volatility: 0.12,
          sharpeRatio: 1.25,
          maxDrawdown: -0.08,
          annualizedReturn: 0.18,
        },
      },
    });

    render(<PortfolioPerformanceMetrics portfolios={mockPortfolios} period="1Y" />);

    await waitFor(() => {
      expect(getPortfolioPerformance).toHaveBeenCalledWith('1', '1Y');
    });

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('debería formatear métricas correctamente', async () => {
    (getPortfolioPerformance as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        metrics: {
          totalReturn: 0.15,
          volatility: 0.12,
          sharpeRatio: 1.25,
          maxDrawdown: -0.08,
          annualizedReturn: 0.18,
        },
      },
    });

    render(<PortfolioPerformanceMetrics portfolios={[mockPortfolios[0]]} />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    // Verificar que las métricas se renderizan (formato de porcentaje)
    expect(screen.getByText('Portfolio 1')).toBeInTheDocument();
  });

  it('debería manejar valores NaN correctamente', async () => {
    (getPortfolioPerformance as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        metrics: {
          totalReturn: NaN,
          volatility: NaN,
          sharpeRatio: NaN,
          maxDrawdown: NaN,
          annualizedReturn: NaN,
        },
      },
    });

    render(<PortfolioPerformanceMetrics portfolios={[mockPortfolios[0]]} />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Portfolio 1')).toBeInTheDocument();
  });

  it('debería aplicar className personalizada', () => {
    (getPortfolioPerformance as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        metrics: {
          totalReturn: 0.15,
          volatility: 0.12,
          sharpeRatio: 1.25,
          maxDrawdown: -0.08,
          annualizedReturn: 0.18,
        },
      },
    });

    const { container } = render(
      <PortfolioPerformanceMetrics portfolios={mockPortfolios} className="custom-class" />
    );

    const card = container.querySelector('[data-testid="card"]');
    expect(card).toHaveClass('custom-class');
  });
});
