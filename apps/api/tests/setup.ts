import { beforeAll, afterAll, afterEach } from 'vitest';
import { app } from '../app';

/**
 * Global setup for API tests
 */

export const testApp = app;

// Setup database or test environment
beforeAll(async () => {
  // Initialize test database connections
  // Set up any required environment variables
});

afterEach(async () => {
  // Clean up after each test
});

afterAll(async () => {
  // Clean up after all tests
});

