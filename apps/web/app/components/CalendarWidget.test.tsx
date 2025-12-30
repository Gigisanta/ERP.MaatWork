/**
 * Tests para CalendarWidget component
 *
 * AI_DECISION: Refactorizado para coincidir con la nueva implementación basada en equipos y useSWR
 * Justificación: El componente cambió drásticamente su API y funcionamiento
 * Impacto: Tests válidos y útiles para el componente actual
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CalendarWidget from './CalendarWidget';
import useSWR from 'swr';

import React from 'react';

// Mock dependencies
vi.mock('@maatwork/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 className={className}>{children}</h3>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  Spinner: ({ size }: { size?: string }) => <div data-testid="spinner">Loading...</div>,
  Alert: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <div role="alert" data-alert-variant={variant}>
      {children}
    </div>
  ),
  Text: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
  Stack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({
    children,
    onClick,
    title,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    title?: string;
  }) => (
    <button onClick={onClick} title={title}>
      {children}
    </button>
  ),
  Select: ({
    value,
    onValueChange,
    items,
    className,
    disabled,
  }: {
    value: string;
    onValueChange: (val: string) => void;
    items: Array<{ value: string; label: string }>;
    className?: string;
    disabled?: boolean;
  }) => (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={className}
      disabled={disabled}
    >
      {items.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  ),
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`}>{name}</span>,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('swr');

vi.mock('./home/WeeklyCalendarView', () => ({
  WeeklyCalendarView: ({ isLoading, events }: { isLoading?: boolean; events: unknown[] }) => (
    <div data-testid="weekly-calendar">
      {isLoading && <div data-testid="spinner">Loading...</div>}
      <div data-testid="events-count">{events.length}</div>
    </div>
  ),
}));

describe('CalendarWidget', () => {
  const mockTeams = [
    {
      id: 'team-1',
      name: 'Team 1',
      calendarId: 'cal-1',
      meetingRoomCalendarId: 'room-1',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería mostrar mensaje de "no tienes equipos" cuando la lista está vacía', () => {
    (useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      error: null,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<CalendarWidget teams={[]} />);
    expect(screen.getByText(/No tienes equipos asignados/i)).toBeInTheDocument();
  });

  it('debería mostrar el calendario para el equipo seleccionado', () => {
    (useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { success: true, data: [] },
      error: null,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<CalendarWidget teams={mockTeams} selectedTeamId="team-1" />);

    expect(screen.getByText('Team 1')).toBeInTheDocument();
    expect(screen.getByTestId('weekly-calendar')).toBeInTheDocument();
  });

  it('debería mostrar loading state desde WeeklyCalendarView', () => {
    (useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      error: null,
      isLoading: true,
      mutate: vi.fn(),
    });

    render(<CalendarWidget teams={mockTeams} selectedTeamId="team-1" />);

    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('debería mostrar mensaje cuando no hay calendario configurado', () => {
    const teamNoCal = [{ id: 'team-2', name: 'No Cal Team' }];
    render(<CalendarWidget teams={teamNoCal} selectedTeamId="team-2" />);

    expect(screen.getByText(/Este equipo no tiene un calendario conectado/i)).toBeInTheDocument();
  });

  it('debería mostrar opción de sala de reuniones si está disponible', () => {
    (useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { success: true, data: [] },
      error: null,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<CalendarWidget teams={mockTeams} selectedTeamId="team-1" />);

    expect(screen.getByText('Reserva Sala de reunion')).toBeInTheDocument();
  });

  it('debería aplicar className personalizada', () => {
    const { container } = render(<CalendarWidget teams={mockTeams} className="custom-class" />);
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});
