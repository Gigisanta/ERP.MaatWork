import { beforeAll, afterAll, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * Global test setup for Vitest
 * Runs before all tests in each test file
 */

// Cleanup after each test to avoid side effects
afterEach(() => {
  cleanup();
});

// Mock environment variables if not set
if (!process.env.VITE_SUPABASE_URL) {
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
}

if (!process.env.VITE_SUPABASE_ANON_KEY) {
  process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
}

if (!process.env.VITE_NOTION_CRM_FALLBACK_URL) {
  process.env.VITE_NOTION_CRM_FALLBACK_URL = 'http://localhost:3001';
}

