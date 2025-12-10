/**
 * Tests para MetricCard component
 *
 * AI_DECISION: Tests unitarios para componente de métricas
 * Justificación: Validación crítica de cálculo de porcentajes y renderizado
 * Impacto: Prevenir errores en visualización de métricas
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock @cactus/ui antes de importar el componente
vi.mock('@cactus/ui', () => ({
  Card: ({ children, className, style }: any) => (
    <div data-testid="card" className={className} style={style}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  Text: ({ children, size, className, style }: any) => (
    <span className={className} style={style}>
      {children}
    </span>
  ),
  Stack: ({ children, direction, gap, align, justify }: any) => <div>{children}</div>,
}));

import { MetricCard } from './MetricCard';

describe('MetricCard', () => {
  it('debería renderizar título y valores', () => {
    render(<MetricCard title="Test Metric" actual={75} goal={100} color="#3b82f6" />);

    expect(screen.getByText('Test Metric')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('Objetivo: 100')).toBeInTheDocument();
  });

  it('debería calcular porcentaje correctamente', () => {
    render(<MetricCard title="Test" actual={50} goal={100} color="#3b82f6" />);

    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('debería limitar porcentaje a 100%', () => {
    render(<MetricCard title="Test" actual={150} goal={100} color="#3b82f6" />);

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('debería manejar goal igual a 0', () => {
    render(<MetricCard title="Test" actual={50} goal={0} color="#3b82f6" />);

    expect(screen.getByText('Objetivo: 0')).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('debería aplicar color personalizado', () => {
    const { container } = render(
      <MetricCard title="Test" actual={75} goal={100} color="#ef4444" />
    );

    const card = container.querySelector('[data-testid="card"]');
    expect(card).toBeInTheDocument();
    if (card) {
      expect(card).toHaveStyle({ borderTop: '3px solid #ef4444' });
    }
  });

  it('debería manejar color como variable CSS', () => {
    const { container } = render(
      <MetricCard title="Test" actual={75} goal={100} color="var(--color-primary)" />
    );

    const card = container.querySelector('[data-testid="card"]') as HTMLElement;
    expect(card).toBeInTheDocument();
    // Verificar que el estilo contiene el color
    expect(card.style.borderTop).toContain('var(--color-primary)');
  });

  it('debería mostrar barra de progreso cuando goal > 0', () => {
    const { container } = render(
      <MetricCard title="Test" actual={75} goal={100} color="#3b82f6" />
    );

    const progressBar = container.querySelector('.h-1\\.5');
    expect(progressBar).toBeInTheDocument();
  });

  it('debería no mostrar barra de progreso cuando goal es 0', () => {
    const { container } = render(<MetricCard title="Test" actual={50} goal={0} color="#3b82f6" />);

    const progressBar = container.querySelector('.h-1\\.5');
    expect(progressBar).not.toBeInTheDocument();
  });
});
