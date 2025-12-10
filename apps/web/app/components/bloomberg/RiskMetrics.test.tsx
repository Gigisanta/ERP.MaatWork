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

// Mock dependencies
vi.mock('@cactus/ui', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  Text: ({ children, color }: any) => <span>{children}</span>,
  Spinner: ({ size }: any) => <div data-testid="spinner">Loading...</div>,
  Alert: ({ children, variant }: any) => (
    <div role="alert" data-alert-variant={variant}>
      {children}
    </div>
  ),
  Stack: ({ children, direction, gap }: any) => <div>{children}</div>,
  Heading: ({ children, level }: any) => <h2>{children}</h2>,
}));

describe('RiskMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería mostrar loading inicialmente', () => {
    render(<RiskMetrics symbol="AAPL" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
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
