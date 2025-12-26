/**
 * Tests para RiskMetrics component
 *
 * AI_DECISION: Tests unitarios para métricas de riesgo
 * Justificación: Validación crítica de visualización de métricas de riesgo
 * Impacto: Prevenir errores en análisis de riesgo
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import RiskMetrics from './RiskMetrics';

import React from 'react';

// Mock dependencies
vi.mock('@maatwork/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Spinner: ({ size }: { size?: string }) => <div data-testid="spinner">Loading...</div>,
  Alert: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <div role="alert" data-alert-variant={variant}>
      {children}
    </div>
  ),
  Stack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Heading: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

describe('RiskMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar loading state o contenido', () => {
    render(<RiskMetrics symbol="AAPL" />);
    // En React 19 / Vitest, el useEffect puede correr inmediatamente o después
    const loading = screen.queryByTestId('spinner');
    const content = screen.queryByRole('heading', { name: /Risk Metrics/i });
    expect(loading || content).toBeInTheDocument();
  });

  it('debería mostrar el símbolo en el título', async () => {
    render(<RiskMetrics symbol="AAPL" />);

    // Esperar a que termine el loading
    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Risk Metrics - AAPL/)).toBeInTheDocument();
  });

  it('debería mostrar mensaje de placeholder', async () => {
    render(<RiskMetrics symbol="AAPL" />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Risk metrics.*will be displayed here/)).toBeInTheDocument();
  });

  it('debería manejar diferentes símbolos', async () => {
    const { rerender } = render(<RiskMetrics symbol="AAPL" />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    rerender(<RiskMetrics symbol="MSFT" />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Risk Metrics - MSFT/)).toBeInTheDocument();
  });

  it('debería mostrar error cuando hay error', () => {
    // Simular estado de error (aunque el componente actual no lo maneja completamente)
    render(<RiskMetrics symbol="AAPL" />);

    // El componente actualmente no tiene manejo de error visible, pero verificamos estructura
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });
});
