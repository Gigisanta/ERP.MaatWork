/**
 * Setup file for integration tests
 *
 * Runs before all integration tests to:
 * - Verify database connection
 * - Run migrations
 * - Setup test data
 */

import { beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDatabase, cleanupTestServer } from './test-server';
import { cleanupTestDatabase } from './test-db';

/**
 * Setup before all integration tests
 */
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';

  // Verify TEST_DATABASE_URL is set
  if (!process.env.TEST_DATABASE_URL && !process.env.DATABASE_URL) {
    throw new Error(
      'TEST_DATABASE_URL or DATABASE_URL must be set for integration tests. ' +
        'Please set TEST_DATABASE_URL to use a separate test database.'
    );
  }

  // Initialize test database
  await setupTestDatabase();

  console.log('✅ Integration test database initialized');
});

/**
 * Cleanup after all integration tests
 */
afterAll(async () => {
  await cleanupTestServer();
  await cleanupTestDatabase();

  console.log('✅ Integration test cleanup completed');
});

/**
 * Cleanup before each test (optional, can be done per test suite)
 */
beforeEach(async () => {
  // Optionally clean up data before each test
  // This can be expensive, so consider doing it per test suite instead
});
