/**
 * Test utilities for UI components
 * 
 * Provides wrappers and helpers specific to UI package components
 */

import { render, type RenderOptions } from '@testing-library/react';
import { type ReactElement } from 'react';
import { vi } from 'vitest';

/**
 * Custom render function for UI components
 * Includes theme provider and other UI-specific providers
 */
export function renderUI(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, {
    ...options,
    // Add UI-specific providers here if needed
  });
}

/**
 * Mock theme for testing
 */
export function createMockTheme() {
  return {
    colors: {
      primary: '#000000',
      secondary: '#666666',
      muted: '#999999',
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
    },
  };
}

/**
 * Mock useTheme hook
 */
export function mockUseTheme(theme?: ReturnType<typeof createMockTheme>) {
  const mockTheme = theme || createMockTheme();
  
  vi.mock('@/hooks/useTheme', () => ({
    useTheme: () => mockTheme,
  }));
  
  return mockTheme;
}

/**
 * Wait for animations to complete
 */
export async function waitForAnimation() {
  await new Promise((resolve) => setTimeout(resolve, 100));
}

/**
 * Mock window.matchMedia for responsive components
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
 * Setup common mocks for UI component tests
 */
export function setupUIMocks() {
  mockMatchMedia();
}

