/**
 * Vitest config for integration tests
 * 
 * Integration tests use a real database connection and require:
 * - TEST_DATABASE_URL environment variable (or DATABASE_URL)
 * - Database migrations run before tests
 * - Clean database state between tests
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'integration',
    globals: true,
    environment: 'node',
    include: ['src/**/*.integration.test.ts', 'src/__tests__/integration/**/*.test.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'src/**/*.test.ts', // Exclude unit tests
    ],
    testTimeout: 30000, // 30 seconds for integration tests
    hookTimeout: 60000, // 60 seconds for setup/teardown
    setupFiles: ['./src/__tests__/helpers/integration-setup.ts'],
    // Parallelization configuration (fewer threads for integration tests)
    threads: true,
    maxConcurrency: 2, // Lower concurrency for DB-heavy tests
    minThreads: 1,
    maxThreads: 2, // Limit threads to avoid DB connection exhaustion
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.integration.test.ts',
        'src/**/*.d.ts',
        'src/index.ts',
        'src/types/**',
        'src/__tests__/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});

