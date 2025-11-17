/**
 * Next.js Router mocks for testing
 * 
 * Provides utilities to mock Next.js routing in tests
 */

// vi is available as a global from vitest/globals
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

/**
 * Create a mock App Router instance
 */
export function createMockAppRouter(overrides?: Partial<AppRouterInstance>): AppRouterInstance {
  return {
    push: vi.fn().mockResolvedValue(undefined),
    replace: vi.fn().mockResolvedValue(undefined),
    prefetch: vi.fn().mockResolvedValue(undefined),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    ...overrides,
  } as unknown as AppRouterInstance;
}

/**
 * Mock useRouter hook from next/navigation
 */
export function mockUseRouter(router?: Partial<AppRouterInstance>) {
  const mockRouter = createMockAppRouter(router);
  
  vi.mock('next/navigation', async () => {
    const actual = await vi.importActual('next/navigation');
    return {
      ...actual,
      useRouter: () => mockRouter,
      usePathname: () => '/',
      useSearchParams: () => new URLSearchParams(),
    };
  });
  
  return mockRouter;
}

/**
 * Mock usePathname hook
 */
export function mockUsePathname(pathname: string) {
  vi.mock('next/navigation', async () => {
    const actual = await vi.importActual('next/navigation');
    return {
      ...actual,
      usePathname: () => pathname,
    };
  });
}

/**
 * Mock useSearchParams hook
 */
export function mockUseSearchParams(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  
  vi.mock('next/navigation', async () => {
    const actual = await vi.importActual('next/navigation');
    return {
      ...actual,
      useSearchParams: () => searchParams,
    };
  });
}

