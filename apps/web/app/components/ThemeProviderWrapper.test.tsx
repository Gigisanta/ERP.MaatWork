/**
 * Tests for ThemeProviderWrapper
 *
 * Covers:
 * - ThemeProviderWrapper rendering
 * - useTheme hook
 * - Theme persistence in localStorage
 * - System preference detection
 * - Media query changes
 * - Error handling when used outside provider
 * - 'system' theme mode (explicit automatic mode)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, cleanup, waitFor } from '@testing-library/react';
import ThemeProviderWrapper, { useTheme } from './ThemeProviderWrapper';

describe('ThemeProviderWrapper', () => {
  const originalMatchMedia = window.matchMedia;
  const originalLocalStorage = window.localStorage;

  beforeEach(() => {
    // Mock localStorage
    const mockStorage: Record<string, string> = {};
    const storageMock = {
      getItem: vi.fn((key: string) => mockStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
      clear: vi.fn(() => {
        for (const key in mockStorage) delete mockStorage[key];
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
      length: 0,
      key: vi.fn((index: number) => Object.keys(mockStorage)[index] || null),
    };

    Object.defineProperty(window, 'localStorage', {
      value: storageMock,
      writable: true,
    });

    vi.clearAllMocks();

    // AI_DECISION: Mock matchMedia and localStorage to ensure test consistency
    // Justificación: jsdom matchMedia and localStorage can be flaky in some environments
    // Impacto: Reliable tests for theme switching and persistence
    
    // Reset document element
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');

    // Mock matchMedia with proper event handling
    const mockMediaQueryList = {
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
        // Store handler for manual triggering
        (mockMediaQueryList as any)._handlers = (mockMediaQueryList as any)._handlers || [];
        (mockMediaQueryList as any)._handlers.push(handler);
      }),
      removeEventListener: vi.fn((event: string, handler: unknown) => {
        (mockMediaQueryList as any)._handlers = (
          (mockMediaQueryList as any)._handlers || []
        ).filter((h: unknown) => h !== handler);
      }),
      dispatchEvent: vi.fn(),
    };

    window.matchMedia = vi.fn().mockImplementation((query: string) => {
      const matches = query === '(prefers-color-scheme: dark)';
      return {
        ...mockMediaQueryList,
        matches,
        media: query,
      };
    });
  });

  afterEach(() => {
    cleanup(); // Clean up DOM between tests
    window.localStorage = originalLocalStorage;
    window.matchMedia = originalMatchMedia;
  });

  describe('ThemeProviderWrapper', () => {
    it('should render children', () => {
      render(
        <ThemeProviderWrapper>
          <div>Test Content</div>
        </ThemeProviderWrapper>
      );
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should use defaultTheme when provided', async () => {
      const TestComponent = () => {
        const { theme } = useTheme();
        return <div>{theme}</div>;
      };

      render(
        <ThemeProviderWrapper defaultTheme="dark">
          <TestComponent />
        </ThemeProviderWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByText('dark')).toBeInTheDocument();
      });
    });

    it('should default to system theme when no saved theme and no defaultTheme', async () => {
      const TestComponent = () => {
        const { theme } = useTheme();
        return <div>{theme}</div>;
      };

      // Mock system prefers dark - must be set BEFORE render
      window.matchMedia = vi.fn().mockImplementation((query: string) => {
        const matches = query === '(prefers-color-scheme: dark)';
        return {
          matches, // true for dark preference
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      });

      await act(async () => {
        render(
          <ThemeProviderWrapper>
            <TestComponent />
          </ThemeProviderWrapper>
        );
      });

      // Wait for useEffect to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should default to 'system' when no theme is saved and no defaultTheme
      expect(screen.getByText('system')).toBeInTheDocument();
      // And DOM should reflect system preference (dark)
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should use saved theme from localStorage', async () => {
      // AI_DECISION: localStorage debe establecerse ANTES de render para que useEffect lo lea
      // Justificación: useEffect lee localStorage en el primer render
      // Impacto: Test corregido para usar waitFor para timing correcto
      localStorage.setItem('maatwork-theme', 'dark');

      const TestComponent = () => {
        const { theme } = useTheme();
        return <div data-testid="theme-value">{theme}</div>;
      };

      render(
        <ThemeProviderWrapper>
          <TestComponent />
        </ThemeProviderWrapper>
      );

      // Wait for useEffect to complete and state to update
      await waitFor(() => {
        const element = screen.getByTestId('theme-value');
        expect(element.textContent).toBe('dark');
      });
    });

    it('should migrate old high-contrast theme to light', async () => {
      // AI_DECISION: Migración de high-contrast a light
      // Justificación: El código migra themes antiguos en useEffect
      // Impacto: Usar waitFor para timing correcto
      localStorage.setItem('maatwork-theme', 'high-contrast');

      const TestComponent = () => {
        const { theme } = useTheme();
        return <div data-testid="theme-value">{theme}</div>;
      };

      render(
        <ThemeProviderWrapper>
          <TestComponent />
        </ThemeProviderWrapper>
      );

      // Wait for useEffect to complete and migration to happen
      await waitFor(() => {
        const element = screen.getByTestId('theme-value');
        expect(element.textContent).toBe('light');
      });

      // localStorage should be updated
      expect(localStorage.getItem('maatwork-theme')).toBe('light');
    });

    it('should set data-theme attribute on document element', async () => {
      render(
        <ThemeProviderWrapper defaultTheme="dark">
          <div>Test</div>
        </ThemeProviderWrapper>
      );
      
      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });
    });
  });

  describe('useTheme', () => {
    it('should return theme context when used within provider', () => {
      const TestComponent = () => {
        const { theme } = useTheme();
        return <div>{theme}</div>;
      };

      render(
        <ThemeProviderWrapper defaultTheme="light">
          <TestComponent />
        </ThemeProviderWrapper>
      );
      expect(screen.getByText('light')).toBeInTheDocument();
    });

    it('should throw error when used outside provider', () => {
      const TestComponent = () => {
        useTheme();
        return <div>Should not render</div>;
      };

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useTheme must be used within ThemeProviderWrapper');

      consoleError.mockRestore();
    });

    it('should allow setting theme', async () => {
      const TestComponent = () => {
        const { theme, setTheme } = useTheme();
        return (
          <div>
            <div data-testid="theme-value">{theme}</div>
            <button onClick={() => setTheme('dark')}>Set Dark</button>
          </div>
        );
      };

      render(
        <ThemeProviderWrapper defaultTheme="light">
          <TestComponent />
        </ThemeProviderWrapper>
      );

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId('theme-value')).toHaveTextContent('light');
      });

      const button = screen.getByText('Set Dark');
      await act(async () => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');
      });
      expect(localStorage.getItem('maatwork-theme')).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should toggle theme between light and dark', async () => {
      const TestComponent = () => {
        const { theme, toggleTheme } = useTheme();
        return (
          <div>
            <div data-testid="theme-val">{theme}</div>
            <button onClick={toggleTheme}>Toggle</button>
          </div>
        );
      };

      render(
        <ThemeProviderWrapper defaultTheme="light">
          <TestComponent />
        </ThemeProviderWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('theme-val')).toHaveTextContent('light');
      });

      const button = screen.getByText('Toggle');
      await act(async () => {
        button.click();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('theme-val')).toHaveTextContent('dark');
      });

      await act(async () => {
        button.click();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('theme-val')).toHaveTextContent('light');
      });
    });

    it('should persist theme to localStorage', async () => {
      const TestComponent = () => {
        const { setTheme } = useTheme();
        return <button onClick={() => setTheme('system')}>Set System</button>;
      };

      render(
        <ThemeProviderWrapper defaultTheme="light">
          <TestComponent />
        </ThemeProviderWrapper>
      );

      const button = screen.getByText('Set System');
      await act(async () => {
        button.click();
      });

      await waitFor(() => {
        expect(localStorage.getItem('maatwork-theme')).toBe('system');
      });
    });

    it('should listen to system preference changes when theme is system', async () => {
      localStorage.setItem('maatwork-theme', 'system');
      let mediaQueryHandler: ((e: MediaQueryListEvent) => void) | null = null;

      // Mock system prefers light initially (matches: false for dark query)
      window.matchMedia = vi.fn().mockImplementation((query) => {
        const isDarkQuery = query === '(prefers-color-scheme: dark)';
        return {
          matches: isDarkQuery ? false : false, // false = system prefers light
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn((event, handler) => {
            if (event === 'change') {
              mediaQueryHandler = handler as (e: MediaQueryListEvent) => void;
            }
          }),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      });

      const TestComponent = () => {
        const { theme, resolvedTheme } = useTheme();
        return (
          <div>
            <div data-testid="theme">{theme}</div>
            <div data-testid="resolved-theme">{resolvedTheme}</div>
          </div>
        );
      };

      render(
        <ThemeProviderWrapper>
          <TestComponent />
        </ThemeProviderWrapper>
      );

      // Wait for useEffect to complete and verify the theme is set correctly
      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('system');
      });

      await waitFor(() => {
        expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
      });

      // Simulate system preference change
      if (mediaQueryHandler) {
        act(() => {
          mediaQueryHandler!({
            matches: true,
            media: '(prefers-color-scheme: dark)',
          } as MediaQueryListEvent);
        });

        await waitFor(() => {
          // Theme should still be 'system', but resolved theme should change
          expect(screen.getByTestId('theme')).toHaveTextContent('system');
          expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
        });
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      }
    });

    it('should not react to system preference changes when theme is fixed (light)', async () => {
      localStorage.setItem('maatwork-theme', 'light');

      let mediaQueryHandler: ((e: MediaQueryListEvent) => void) | null = null;

      window.matchMedia = vi.fn().mockImplementation((query) => {
        return {
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn((event, handler) => {
            if (event === 'change') {
              mediaQueryHandler = handler as (e: MediaQueryListEvent) => void;
            }
          }),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      });

      const TestComponent = () => {
        const { theme, resolvedTheme } = useTheme();
        return (
          <div>
            <div data-testid="theme">{theme}</div>
            <div data-testid="resolved-theme">{resolvedTheme}</div>
          </div>
        );
      };

      render(
        <ThemeProviderWrapper>
          <TestComponent />
        </ThemeProviderWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('light');
      });
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      // Simulate system preference change to dark
      if (mediaQueryHandler) {
        act(() => {
          mediaQueryHandler({
            matches: true,
            media: '(prefers-color-scheme: dark)',
          } as MediaQueryListEvent);
        });
        // Theme should remain 'light' and not change
        expect(screen.getByTestId('theme')).toHaveTextContent('light');
        expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      }
    });

    it('should allow setting system theme explicitly', async () => {
      const TestComponent = () => {
        const { theme, setTheme, resolvedTheme } = useTheme();
        return (
          <div>
            <div data-testid="theme">{theme}</div>
            <div data-testid="resolved-theme">{resolvedTheme}</div>
            <button onClick={() => setTheme('system')}>Set System</button>
          </div>
        );
      };

      // Mock system prefers dark - must be set BEFORE render
      window.matchMedia = vi.fn().mockImplementation((query) => {
        const matches = query === '(prefers-color-scheme: dark)';
        return {
          matches, // true for dark preference
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        };
      });

      render(
        <ThemeProviderWrapper defaultTheme="light">
          <TestComponent />
        </ThemeProviderWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('light');
      });

      const button = screen.getByText('Set System');
      await act(async () => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('system');
      });
      expect(localStorage.getItem('maatwork-theme')).toBe('system');
      // Resolved theme should follow system preference (dark in this mock)
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });
});
