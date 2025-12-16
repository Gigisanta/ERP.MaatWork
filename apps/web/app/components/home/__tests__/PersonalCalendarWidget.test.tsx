/**
 * PersonalCalendarWidget Tests
 *
 * AI_DECISION: Tests para verificar estados del widget de calendario
 * Justificación: Asegurar que el widget maneja correctamente todos los estados
 * Impacto: Previene regresiones, documenta comportamiento esperado
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PersonalCalendarWidget } from '../PersonalCalendarWidget';
import * as apiHooks from '@/lib/api-hooks';
import * as authContext from '../../../auth/AuthContext';

// Mock dependencies
vi.mock('@/lib/api-hooks');
vi.mock('../../../auth/AuthContext');
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PersonalCalendarWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show connection prompt when user is not connected', () => {
    // Mock user not connected
    vi.mocked(authContext.useAuth).mockReturnValue({
      user: { id: '1', email: 'test@test.com', isGoogleConnected: false } as any,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    vi.mocked(apiHooks.useCalendarEvents).mockReturnValue({
      data: [],
      error: null,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<PersonalCalendarWidget />);

    expect(screen.getByText('Conecta tu Google Calendar para ver tus eventos')).toBeInTheDocument();
    expect(screen.getByText('Conectar en Perfil')).toBeInTheDocument();
  });

  it('should show loading skeleton when fetching events', () => {
    vi.mocked(authContext.useAuth).mockReturnValue({
      user: { id: '1', email: 'test@test.com', isGoogleConnected: true } as any,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    vi.mocked(apiHooks.useCalendarEvents).mockReturnValue({
      data: [],
      error: null,
      isLoading: true,
      mutate: vi.fn(),
    });

    render(<PersonalCalendarWidget />);

    // Should show skeleton loading
    const skeletons = screen
      .getAllByRole('generic')
      .filter((el) => el.className.includes('animate-pulse'));
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should show auth error with reconnect button', () => {
    vi.mocked(authContext.useAuth).mockReturnValue({
      user: { id: '1', email: 'test@test.com', isGoogleConnected: true } as any,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    const authError = new Error('Unauthorized');
    (authError as any).status = 401;
    (authError as any).isAuthError = true;

    vi.mocked(apiHooks.useCalendarEvents).mockReturnValue({
      data: [],
      error: authError,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<PersonalCalendarWidget />);

    expect(screen.getByText(/Tu conexión con Google Calendar expiró/)).toBeInTheDocument();
    expect(screen.getByText('Reconectar cuenta')).toBeInTheDocument();
    expect(screen.getByText('Reintentar')).toBeInTheDocument();
  });

  it('should show generic error with retry button', () => {
    vi.mocked(authContext.useAuth).mockReturnValue({
      user: { id: '1', email: 'test@test.com', isGoogleConnected: true } as any,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    const genericError = new Error('Network error');

    vi.mocked(apiHooks.useCalendarEvents).mockReturnValue({
      data: [],
      error: genericError,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<PersonalCalendarWidget />);

    expect(screen.getByText(/Error al cargar eventos: Network error/)).toBeInTheDocument();
    expect(screen.getByText('Revisar conexión')).toBeInTheDocument();
    expect(screen.getByText('Reintentar')).toBeInTheDocument();
  });

  it('should show empty state when no events', () => {
    vi.mocked(authContext.useAuth).mockReturnValue({
      user: { id: '1', email: 'test@test.com', isGoogleConnected: true } as any,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    vi.mocked(apiHooks.useCalendarEvents).mockReturnValue({
      data: [],
      error: null,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<PersonalCalendarWidget />);

    expect(screen.getByText('No tienes eventos para los próximos 7 días')).toBeInTheDocument();
  });

  it('should display events when available', () => {
    vi.mocked(authContext.useAuth).mockReturnValue({
      user: { id: '1', email: 'test@test.com', isGoogleConnected: true } as any,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    const mockEvents = [
      {
        id: '1',
        summary: 'Test Event 1',
        start: { dateTime: '2024-01-15T10:00:00Z' },
        end: { dateTime: '2024-01-15T11:00:00Z' },
        status: 'confirmed',
        htmlLink: 'https://calendar.google.com/event1',
      },
      {
        id: '2',
        summary: 'Test Event 2',
        start: { date: '2024-01-16' },
        end: { date: '2024-01-16' },
        status: 'confirmed',
        htmlLink: 'https://calendar.google.com/event2',
      },
    ];

    vi.mocked(apiHooks.useCalendarEvents).mockReturnValue({
      data: mockEvents as any,
      error: null,
      isLoading: false,
      mutate: vi.fn(),
    });

    render(<PersonalCalendarWidget />);

    expect(screen.getByText('Test Event 1')).toBeInTheDocument();
    expect(screen.getByText('Test Event 2')).toBeInTheDocument();
    expect(screen.getByText('Todo el día')).toBeInTheDocument();
  });

  it('should have refresh button that calls mutate', async () => {
    const mutateMock = vi.fn();

    vi.mocked(authContext.useAuth).mockReturnValue({
      user: { id: '1', email: 'test@test.com', isGoogleConnected: true } as any,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });

    vi.mocked(apiHooks.useCalendarEvents).mockReturnValue({
      data: [],
      error: null,
      isLoading: false,
      mutate: mutateMock,
    });

    render(<PersonalCalendarWidget />);

    const refreshButton = screen.getByText('Actualizar');
    refreshButton.click();

    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalled();
    });
  });
});
