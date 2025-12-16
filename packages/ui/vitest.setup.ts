import { vi, afterEach, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Extender tipos de vitest con jest-dom matchers
declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<T = unknown> extends jest.Matchers<void, T> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends jest.Matchers<void, unknown> {}
}

// Cleanup after each test
afterEach(async () => {
  cleanup();
  // Wait a bit for any async callbacks to complete
  await new Promise((resolve) => setTimeout(resolve, 0));
});

// Suppress React 18 act() warnings and Radix UI accessibility warnings in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('ReactDOMTestUtils.act') ||
        args[0].includes('Warning: An update to') ||
        args[0].includes('wrapped in act') ||
        args[0].includes('DialogContent') ||
        args[0].includes('DialogTitle') ||
        args[0].includes('error boundary'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('DialogContent') || args[0].includes('DialogTitle'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Global test utilities - Use class-based mocks for proper constructor support
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
