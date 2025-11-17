/**
 * Mock helpers for Next.js router
 * 
 * Provides factory functions to create mocks for Next.js router-related tests
 */

// vi is available as a global from vitest/globals

/**
 * Creates a mock Next.js router
 */
export function createMockRouter(overrides?: {
  push?: ReturnType<typeof vi.fn>;
  replace?: ReturnType<typeof vi.fn>;
  back?: ReturnType<typeof vi.fn>;
  forward?: ReturnType<typeof vi.fn>;
  refresh?: ReturnType<typeof vi.fn>;
  prefetch?: ReturnType<typeof vi.fn>;
}) {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    ...overrides,
  };
}

/**
 * Creates a mock useRouter hook
 */
export function createMockUseRouter(overrides?: Parameters<typeof createMockRouter>[0]) {
  return vi.fn(() => createMockRouter(overrides));
}

/**
 * Creates a mock usePathname hook
 */
export function createMockUsePathname(pathname: string = '/') {
  return vi.fn(() => pathname);
}

/**
 * Creates a mock useSearchParams hook
 */
export function createMockUseSearchParams(params: Record<string, string> = {}) {
  return vi.fn(() => ({
    get: vi.fn((key: string) => params[key] ?? null),
    has: vi.fn((key: string) => key in params),
    getAll: vi.fn((key: string) => (params[key] ? [params[key]] : [])),
    keys: vi.fn(() => Object.keys(params)),
    values: vi.fn(() => Object.values(params)),
    entries: vi.fn(() => Object.entries(params)),
    toString: vi.fn(() => new URLSearchParams(params).toString()),
  }));
}

