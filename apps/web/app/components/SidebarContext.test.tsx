/**
 * Tests para SidebarContext
 *
 * AI_DECISION: Tests unitarios para SidebarContext
 * Justificación: Validación de estado de sidebar
 * Impacto: Prevenir errores en UI de sidebar
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { SidebarProvider, useSidebar } from './SidebarContext';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

describe('SidebarProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debería proporcionar collapsed false por defecto', () => {
    const TestComponent = () => {
      const { collapsed } = useSidebar();
      return <div>{collapsed ? 'collapsed' : 'expanded'}</div>;
    };

    render(
      <SidebarProvider>
        <TestComponent />
      </SidebarProvider>
    );

    expect(screen.getByText('expanded')).toBeInTheDocument();
  });

  it('debería cargar estado desde localStorage', () => {
    localStorageMock.setItem('sidebar-collapsed', 'true');

    const TestComponent = () => {
      const { collapsed } = useSidebar();
      return <div>{collapsed ? 'collapsed' : 'expanded'}</div>;
    };

    render(
      <SidebarProvider>
        <TestComponent />
      </SidebarProvider>
    );

    expect(screen.getByText('collapsed')).toBeInTheDocument();
  });

  it('debería guardar estado en localStorage cuando cambia', () => {
    const TestComponent = () => {
      const { collapsed, setCollapsed } = useSidebar();
      return (
        <div>
          <span>{collapsed ? 'collapsed' : 'expanded'}</span>
          <button onClick={() => setCollapsed(!collapsed)}>Toggle</button>
        </div>
      );
    };

    render(
      <SidebarProvider>
        <TestComponent />
      </SidebarProvider>
    );

    expect(screen.getByText('expanded')).toBeInTheDocument();

    act(() => {
      screen.getByText('Toggle').click();
    });

    expect(screen.getByText('collapsed')).toBeInTheDocument();
    expect(localStorageMock.getItem('sidebar-collapsed')).toBe('true');
  });

  it('debería usar default expanded cuando no hay valor guardado', () => {
    localStorageMock.removeItem('sidebar-collapsed');

    const TestComponent = () => {
      const { collapsed } = useSidebar();
      return <div>{collapsed ? 'collapsed' : 'expanded'}</div>;
    };

    render(
      <SidebarProvider>
        <TestComponent />
      </SidebarProvider>
    );

    expect(screen.getByText('expanded')).toBeInTheDocument();
  });
});

describe('useSidebar hook', () => {
  beforeEach(() => {
    localStorageMock.clear();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  it('debería retornar collapsed y setCollapsed', () => {
    const TestComponent = () => {
      const { collapsed, setCollapsed } = useSidebar();
      return (
        <div>
          <span data-testid="collapsed">{collapsed.toString()}</span>
          <button onClick={() => setCollapsed(true)}>Collapse</button>
        </div>
      );
    };

    render(
      <SidebarProvider>
        <TestComponent />
      </SidebarProvider>
    );

    expect(screen.getByTestId('collapsed').textContent).toBe('false');

    act(() => {
      screen.getByText('Collapse').click();
    });

    expect(screen.getByTestId('collapsed').textContent).toBe('true');
  });

  it('debería lanzar error cuando se usa fuera de SidebarProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const TestComponent = () => {
      useSidebar();
      return <div>Test</div>;
    };

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useSidebar must be used within a SidebarProvider');

    consoleError.mockRestore();
  });
});
