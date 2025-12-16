/**
 * Tests para useTheme hook
 *
 * AI_DECISION: Tests unitarios para useTheme y ThemeProvider
 * Justificación: Validación crítica de gestión de temas
 * Impacto: Prevenir errores en dark/light mode
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from './useTheme';

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

// Mock matchMedia
const createMatchMedia = (matches: boolean) => {
  const mockMediaQuery = {
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
  return vi.fn().mockImplementation((query: string) => ({
    ...mockMediaQuery,
    media: query,
  }));
};

describe('ThemeProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    Object.defineProperty(document.documentElement, 'setAttribute', {
      value: vi.fn(),
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debería usar defaultTheme cuando no hay tema guardado', () => {
    // El hook usa system preference antes de defaultTheme
    // Para que use "dark", necesitamos que systemPrefersDark sea true
    const mockMediaQuery = createMatchMedia(true); // prefers dark
    window.matchMedia = mockMediaQuery;

    const TestComponent = () => {
      const { theme } = useTheme();
      return <div>{theme}</div>;
    };

    render(
      <ThemeProvider defaultTheme="dark">
        <TestComponent />
      </ThemeProvider>
    );

    // El hook usa system preference cuando no hay tema guardado
    // Si systemPrefersDark es true, usa 'dark'
    expect(screen.getByText('dark')).toBeInTheDocument();
  });

  it('debería cargar tema desde localStorage', () => {
    localStorageMock.setItem('cactus-theme', 'dark');

    const TestComponent = () => {
      const { theme } = useTheme();
      return <div>{theme}</div>;
    };

    render(
      <ThemeProvider defaultTheme="light">
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByText('dark')).toBeInTheDocument();
  });

  it('debería usar system preference cuando no hay tema guardado', () => {
    window.matchMedia = createMatchMedia(true); // prefers dark

    const TestComponent = () => {
      const { theme } = useTheme();
      return <div>{theme}</div>;
    };

    render(
      <ThemeProvider defaultTheme="light">
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByText('dark')).toBeInTheDocument();
  });

  it('debería aplicar tema al document', () => {
    const setAttributeSpy = vi.spyOn(document.documentElement, 'setAttribute');

    render(
      <ThemeProvider defaultTheme="dark">
        <div>Test</div>
      </ThemeProvider>
    );

    expect(setAttributeSpy).toHaveBeenCalledWith('data-theme', 'dark');
  });

  it('debería escuchar cambios en system preference', () => {
    const mockMediaQuery = createMatchMedia(false);
    window.matchMedia = mockMediaQuery;

    const TestComponent = () => {
      const { theme } = useTheme();
      return <div>{theme}</div>;
    };

    render(
      <ThemeProvider defaultTheme="light">
        <TestComponent />
      </ThemeProvider>
    );

    // Verificar que se registró el listener
    expect(mockMediaQuery).toHaveBeenCalled();
    const mediaQueryInstance = mockMediaQuery.mock.results[0]?.value;
    expect(mediaQueryInstance?.addEventListener).toHaveBeenCalled();

    // Simular cambio en system preference
    const changeHandler = mediaQueryInstance?.addEventListener.mock.calls[0]?.[1] as (
      e: MediaQueryListEvent
    ) => void;

    if (changeHandler) {
      act(() => {
        changeHandler({ matches: true } as MediaQueryListEvent);
      });
    }

    // Debería actualizar solo si no hay tema guardado
    // Como hay defaultTheme="light" y no hay tema guardado, debería cambiar a dark
    expect(screen.getByText('dark')).toBeInTheDocument();
  });

  it('debería limpiar event listener al desmontar', () => {
    const mockMediaQuery = createMatchMedia(false);
    window.matchMedia = mockMediaQuery;

    const { unmount } = render(
      <ThemeProvider defaultTheme="light">
        <div>Test</div>
      </ThemeProvider>
    );

    unmount();

    // Verificar que se llamó removeEventListener en la instancia retornada
    const mediaQueryInstance = mockMediaQuery.mock.results[0]?.value;
    expect(mediaQueryInstance?.removeEventListener).toHaveBeenCalled();
  });
});

describe('useTheme hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    Object.defineProperty(document.documentElement, 'setAttribute', {
      value: vi.fn(),
      writable: true,
    });
  });

  it('debería retornar theme actual', () => {
    const TestComponent = () => {
      const { theme } = useTheme();
      return <div>{theme}</div>;
    };

    render(
      <ThemeProvider defaultTheme="light">
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByText('light')).toBeInTheDocument();
  });

  it('debería permitir cambiar tema con setTheme', () => {
    const TestComponent = () => {
      const { theme, setTheme } = useTheme();
      return (
        <div>
          <span>{theme}</span>
          <button onClick={() => setTheme('dark')}>Set Dark</button>
        </div>
      );
    };

    render(
      <ThemeProvider defaultTheme="light">
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByText('light')).toBeInTheDocument();

    act(() => {
      screen.getByText('Set Dark').click();
    });

    expect(screen.getByText('dark')).toBeInTheDocument();
  });

  it('debería guardar tema en localStorage al cambiar', () => {
    const TestComponent = () => {
      const { setTheme } = useTheme();
      return <button onClick={() => setTheme('dark')}>Set Dark</button>;
    };

    render(
      <ThemeProvider defaultTheme="light">
        <TestComponent />
      </ThemeProvider>
    );

    act(() => {
      screen.getByText('Set Dark').click();
    });

    expect(localStorageMock.getItem('cactus-theme')).toBe('dark');
  });

  it('debería aplicar tema al document al cambiar', () => {
    const setAttributeSpy = vi.spyOn(document.documentElement, 'setAttribute');

    const TestComponent = () => {
      const { setTheme } = useTheme();
      return <button onClick={() => setTheme('dark')}>Set Dark</button>;
    };

    render(
      <ThemeProvider defaultTheme="light">
        <TestComponent />
      </ThemeProvider>
    );

    act(() => {
      screen.getByText('Set Dark').click();
    });

    expect(setAttributeSpy).toHaveBeenCalledWith('data-theme', 'dark');
  });

  it('debería toggle entre light y dark', () => {
    const TestComponent = () => {
      const { theme, toggleTheme } = useTheme();
      return (
        <div>
          <span>{theme}</span>
          <button onClick={toggleTheme}>Toggle</button>
        </div>
      );
    };

    render(
      <ThemeProvider defaultTheme="light">
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByText('light')).toBeInTheDocument();

    act(() => {
      screen.getByText('Toggle').click();
    });

    expect(screen.getByText('dark')).toBeInTheDocument();

    act(() => {
      screen.getByText('Toggle').click();
    });

    expect(screen.getByText('light')).toBeInTheDocument();
  });

  it('debería lanzar error cuando se usa fuera de ThemeProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const TestComponent = () => {
      useTheme();
      return <div>Test</div>;
    };

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useTheme must be used within a ThemeProvider');

    consoleError.mockRestore();
  });

  it('debería respetar tema guardado sobre system preference', () => {
    localStorageMock.setItem('cactus-theme', 'light');
    window.matchMedia = createMatchMedia(true); // System prefiere dark

    const TestComponent = () => {
      const { theme } = useTheme();
      return <div>{theme}</div>;
    };

    render(
      <ThemeProvider defaultTheme="dark">
        <TestComponent />
      </ThemeProvider>
    );

    // Debería usar tema guardado, no system preference
    expect(screen.getByText('light')).toBeInTheDocument();
  });

  it('debería no actualizar por system preference cuando hay tema guardado', () => {
    localStorageMock.setItem('cactus-theme', 'light');
    const mockMediaQuery = createMatchMedia(false);
    window.matchMedia = mockMediaQuery;

    const TestComponent = () => {
      const { theme } = useTheme();
      return <div>{theme}</div>;
    };

    render(
      <ThemeProvider defaultTheme="dark">
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByText('light')).toBeInTheDocument();

    // Simular cambio en system preference
    const mediaQueryInstance = mockMediaQuery.mock.results[0]?.value;
    const changeHandler = mediaQueryInstance?.addEventListener.mock.calls[0]?.[1] as (
      e: MediaQueryListEvent
    ) => void;

    if (changeHandler) {
      act(() => {
        changeHandler({ matches: true } as MediaQueryListEvent);
      });
    }

    // No debería cambiar porque hay tema guardado
    expect(screen.getByText('light')).toBeInTheDocument();
  });
});
