/**
 * Common mocks for testing
 */

import { vi } from 'vitest';

/**
 * Mock localStorage
 */
export function mockLocalStorage() {
  const store: Record<string, string> = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
}

/**
 * Mock fetch
 */
export function createMockFetch(response: any, status = 200) {
  return vi.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
      headers: new Headers(),
    } as Response)
  );
}

/**
 * Mock Supabase client
 */
export function createMockSupabaseClient() {
  return {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };
}

/**
 * Mock Notion client
 */
export function createMockNotionClient() {
  return {
    databases: {
      query: vi.fn(),
      retrieve: vi.fn(),
    },
    pages: {
      create: vi.fn(),
      update: vi.fn(),
      retrieve: vi.fn(),
    },
  };
}

