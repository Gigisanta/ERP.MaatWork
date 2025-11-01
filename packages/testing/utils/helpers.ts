/**
 * Common testing utilities and helpers
 */

import { expect as playwrightExpect } from '@playwright/test';
import { expect as vitestExpect } from 'vitest';

/**
 * Wait for a specific condition to be true
 */
export async function waitFor(condition: () => boolean, timeout = 5000): Promise<void> {
  const start = Date.now();
  
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Wait timeout exceeded');
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

/**
 * Generate a random email for testing
 */
export function generateTestEmail(prefix = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}-${timestamp}-${random}@example.com`;
}

/**
 * Generate a random phone number for testing
 */
export function generateTestPhone(): string {
  const area = Math.floor(Math.random() * 900) + 100;
  const number = Math.floor(Math.random() * 9000000) + 1000000;
  return `+1${area}${number}`;
}

/**
 * Create a delay in tests
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Try-catch wrapper for async operations in tests
 */
export async function tryCatch<T>(
  fn: () => Promise<T>
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Assert that a value is not null or undefined
 */
export function assertExists<T>(value: T | null | undefined, message?: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || 'Value is null or undefined');
  }
}

