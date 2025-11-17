/**
 * Test utilities for Web components
 * 
 * Provides wrappers and helpers for Testing Library in Next.js context
 */

import { render, type RenderOptions } from '@testing-library/react';
import { type ReactElement } from 'react';
// vi is available as a global from vitest/globals

/**
 * Custom render function that includes providers
 * Use this instead of the default render from @testing-library/react
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, {
    ...options,
    // Add any global providers here (ThemeProvider, AuthProvider, etc.)
  });
}

/**
 * Wait for async operations to complete
 */
export async function waitForAsync() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Mock Next.js router
 */
export function createMockRouter(overrides?: Partial<{
  pathname: string;
  query: Record<string, string>;
  asPath: string;
  push: (url: string) => Promise<boolean>;
  replace: (url: string) => Promise<boolean>;
  back: () => void;
  reload: () => void;
  prefetch: (url: string) => Promise<void>;
}>): {
  pathname: string;
  query: Record<string, string>;
  asPath: string;
  push: (url: string) => Promise<boolean>;
  replace: (url: string) => Promise<boolean>;
  back: () => void;
  reload: () => void;
  prefetch: (url: string) => Promise<void>;
} {
  return {
    pathname: overrides?.pathname || '/',
    query: overrides?.query || {},
    asPath: overrides?.asPath || '/',
    push: overrides?.push || vi.fn().mockResolvedValue(true),
    replace: overrides?.replace || vi.fn().mockResolvedValue(true),
    back: overrides?.back || vi.fn(),
    reload: overrides?.reload || vi.fn(),
    prefetch: overrides?.prefetch || vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Mock Next.js useRouter hook
 */
export function mockUseRouter(router?: ReturnType<typeof createMockRouter>) {
  const mockRouter = router || createMockRouter();
  
  vi.mock('next/navigation', () => ({
    useRouter: () => mockRouter,
    usePathname: () => mockRouter.pathname,
    useSearchParams: () => new URLSearchParams(mockRouter.query as Record<string, string>),
  }));
}

/**
 * Mock SWR response
 */
export function createMockSWRResponse<T>(data?: T, error?: Error) {
  return {
    data,
    error,
    isLoading: !data && !error,
    isValidating: false,
    mutate: vi.fn(),
    mutateKey: vi.fn(),
  };
}

/**
 * Mock fetch response
 */
export function createMockFetchResponse<T>(data: T, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
    headers: new Headers(),
  };
}

/**
 * Mock window.matchMedia
 */
export function mockMatchMedia(matches = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

/**
 * Mock IntersectionObserver
 */
export function mockIntersectionObserver() {
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  } as unknown as typeof IntersectionObserver;
}

/**
 * Mock ResizeObserver
 */
export function mockResizeObserver() {
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  } as unknown as typeof ResizeObserver;
}

/**
 * Setup common mocks for component tests
 */
export function setupComponentMocks() {
  mockMatchMedia();
  mockIntersectionObserver();
  mockResizeObserver();
}

