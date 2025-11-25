/**
 * Tests para CalendarWidget component
 * 
 * AI_DECISION: Tests unitarios para widget de calendario
 * Justificación: Validación crítica de normalización de URLs y carga de iframe
 * Impacto: Prevenir errores en visualización de calendarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CalendarWidget from './CalendarWidget';

// Mock dependencies
vi.mock('@cactus/ui', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  Spinner: ({ size }: any) => <div data-testid="spinner">Loading...</div>,
  Alert: ({ children, variant }: any) => (
    <div role="alert" data-alert-variant={variant}>{children}</div>
  ),
  Text: ({ children, size, weight, color, className }: any) => (
    <span className={className}>{children}</span>
  ),
  Stack: ({ children, direction, gap, align }: any) => <div>{children}</div>,
  Button: ({ children, variant, size }: any) => <button>{children}</button>
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>
}));

describe('CalendarWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debería mostrar loading inicialmente', () => {
    render(<CalendarWidget calendarUrl="https://calendar.google.com/calendar/embed?src=test" />);

    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('debería normalizar URL de embed agregando mode=week', () => {
    const url = 'https://calendar.google.com/calendar/embed?src=test';
    const { container } = render(<CalendarWidget calendarUrl={url} />);

    const iframe = container.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe?.src).toContain('mode=week');
  });

  it('debería convertir URL con cid a embed', () => {
    const url = 'https://calendar.google.com/calendar/render?cid=test@example.com';
    const { container } = render(<CalendarWidget calendarUrl={url} />);

    const iframe = container.querySelector('iframe');
    expect(iframe?.src).toContain('/embed');
    expect(iframe?.src).toContain('src=test%40example.com');
    expect(iframe?.src).toContain('mode=week');
  });

  it('debería manejar URL inválida', () => {
    const url = 'not-a-valid-url';
    const { container } = render(<CalendarWidget calendarUrl={url} />);

    const iframe = container.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe?.src).toBe(url);
  });

  it('debería ocultar loading cuando iframe carga', async () => {
    const { container } = render(
      <CalendarWidget calendarUrl="https://calendar.google.com/calendar/embed?src=test" />
    );

    expect(screen.getByTestId('spinner')).toBeInTheDocument();

    const iframe = container.querySelector('iframe');
    if (iframe) {
      iframe.dispatchEvent(new Event('load'));
    }

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });
  });

  it('debería mostrar error cuando iframe falla', async () => {
    const { container } = render(
      <CalendarWidget calendarUrl="https://calendar.google.com/calendar/embed?src=test" />
    );

    const iframe = container.querySelector('iframe');
    if (iframe) {
      iframe.dispatchEvent(new Event('error'));
    }

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('data-alert-variant', 'error');
  });

  it('debería aplicar className personalizada', () => {
    const { container } = render(
      <CalendarWidget
        calendarUrl="https://calendar.google.com/calendar/embed?src=test"
        className="custom-class"
      />
    );

    const card = container.querySelector('.custom-class');
    expect(card).toBeInTheDocument();
  });
});

