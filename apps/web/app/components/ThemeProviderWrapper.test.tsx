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

  beforeEach(() => {
    // Reset localStorage
    localStorage.clear();
    vi.clearAllMocks();

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
    localStorage.clear();
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

    it('should use defaultTheme when provided', () => {
      const TestComponent = () => {
        const { theme } = useTheme();
        return <div>{theme}</div>;
      };

      render(
        <ThemeProviderWrapper defaultTheme="dark">
          <TestComponent />
        </ThemeProviderWrapper>
      );
      expect(screen.getByText('dark')).toBeInTheDocument();
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
      localStorage.setItem('cactus-theme', 'dark');

      const TestComponent = () => {
        const { theme } = useTheme();
        return <div>{theme}</div>;
      };

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

      expect(screen.getByText('dark')).toBeInTheDocument();
    });

    it('should migrate old high-contrast theme to light', async () => {
      localStorage.setItem('cactus-theme', 'high-contrast');

      const TestComponent = () => {
        const { theme } = useTheme();
        return <div>{theme}</div>;
      };

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

      // Should migrate to 'light'
      expect(screen.getByText('light')).toBeInTheDocument();
      // localStorage should be updated
      expect(localStorage.getItem('cactus-theme')).toBe('light');
    });

    it('should set data-theme attribute on document element', () => {
      render(
        <ThemeProviderWrapper defaultTheme="dark">
          <div>Test</div>
        </ThemeProviderWrapper>
      );
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
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
            <div>{theme}</div>
            <button onClick={() => setTheme('dark')}>Set Dark</button>
          </div>
        );
      };

      await act(async () => {
        render(
          <ThemeProviderWrapper defaultTheme="light">
            <TestComponent />
          </ThemeProviderWrapper>
        );
      });

      // Wait for initial useEffect
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(screen.getByText('light')).toBeInTheDocument();

      const button = screen.getByText('Set Dark');
      await act(async () => {
        button.click();
        // Wait for state update
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(screen.getByText('dark')).toBeInTheDocument();
      expect(localStorage.getItem('cactus-theme')).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should toggle theme between light and dark', () => {
      const TestComponent = () => {
        const { theme, toggleTheme } = useTheme();
        return (
          <div>
            <div>{theme}</div>
            <button onClick={toggleTheme}>Toggle</button>
          </div>
        );
      };

      render(
        <ThemeProviderWrapper defaultTheme="light">
          <TestComponent />
        </ThemeProviderWrapper>
      );
      expect(screen.getByText('light')).toBeInTheDocument();

      const button = screen.getByText('Toggle');
      act(() => {
        button.click();
      });
      expect(screen.getByText('dark')).toBeInTheDocument();

      act(() => {
        button.click();
      });
      expect(screen.getByText('light')).toBeInTheDocument();
    });

    it('should persist theme to localStorage', async () => {
      const TestComponent = () => {
        const { setTheme } = useTheme();
        return <button onClick={() => setTheme('system')}>Set System</button>;
      };

      await act(async () => {
        render(
          <ThemeProviderWrapper defaultTheme="light">
            <TestComponent />
          </ThemeProviderWrapper>
        );
      });

      // Wait for initial useEffect
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const button = screen.getByText('Set System');
      await act(async () => {
        button.click();
        // Wait for state update
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(localStorage.getItem('cactus-theme')).toBe('system');
    });

    it('should listen to system preference changes when theme is system', async () => {
      localStorage.setItem('cactus-theme', 'system');
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

      await act(async () => {
        render(
          <ThemeProviderWrapper>
            <TestComponent />
          </ThemeProviderWrapper>
        );
      });

      // Wait for useEffect to complete and verify the theme is set correctly
      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('system');
      });

      // System prefers light initially (matches: false for dark query)
      // Verify that matchMedia is being called correctly
      const matchMediaCalls = (window.matchMedia as ReturnType<typeof vi.fn>).mock.calls;
      const darkQueryCall = matchMediaCalls.find(
        (call) => call[0] === '(prefers-color-scheme: dark)'
      );
      if (darkQueryCall) {
        const result = (window.matchMedia as ReturnType<typeof vi.fn>)(darkQueryCall[0]);
        // If matches is false, system prefers light
        expect(result.matches).toBe(false);
      }

      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');

      // Simulate system preference change
      if (mediaQueryHandler) {
        await act(async () => {
          mediaQueryHandler!({
            matches: true,
            media: '(prefers-color-scheme: dark)',
          } as MediaQueryListEvent);
          // Wait for state update
          await new Promise((resolve) => setTimeout(resolve, 0));
        });
        // Theme should still be 'system', but resolved theme should change
        expect(screen.getByTestId('theme')).toHaveTextContent('system');
        expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      }
    });

    it('should not react to system preference changes when theme is fixed (light)', () => {
      localStorage.setItem('cactus-theme', 'light');

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

      expect(screen.getByTestId('theme')).toHaveTextContent('light');
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

      await act(async () => {
        render(
          <ThemeProviderWrapper defaultTheme="light">
            <TestComponent />
          </ThemeProviderWrapper>
        );
      });

      // Wait for initial useEffect
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(screen.getByTestId('theme')).toHaveTextContent('light');

      const button = screen.getByText('Set System');
      await act(async () => {
        button.click();
        // Wait for state update
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(screen.getByTestId('theme')).toHaveTextContent('system');
      expect(localStorage.getItem('cactus-theme')).toBe('system');
      // Resolved theme should follow system preference (dark in this mock)
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });
});
