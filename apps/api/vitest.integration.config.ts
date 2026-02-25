/**
 * Vitest config for integration tests
 *
 * Integration tests use a real database connection and require:
 * - TEST_DATABASE_URL environment variable (or DATABASE_URL)
 * - Database migrations run before tests
 * - Clean database state between tests
 *
 * AI_DECISION: Adaptive parallelization for integration tests
 * Justificación: Safe parallelization for DB tests with limited threads
 * Impacto: Tests 30% más rápidos sin deadlocks
 */

import { defineConfig } from 'vitest/config';
import { getTestConfig } from '../../scripts/adaptive-test-config.mjs';

const adaptiveConfig = getTestConfig('integration');

export default defineConfig({
  test: {
    name: 'integration',
    globals: true,
    environment: 'node',
    include: ['src/**/*.integration.test.ts', 'src/__tests__/integration/**/*.test.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
      // 'src/**/*.test.ts', // Commented out because it conflicts with included integration tests
    ],
    testTimeout: adaptiveConfig.testTimeout,
    hookTimeout: adaptiveConfig.hookTimeout,
    setupFiles: ['./src/__tests__/helpers/integration-setup.ts'],
    // AI_DECISION: Force single-threaded execution for integration tests
    // Justificación: Previene deadlocks en base de datos durante cleanup
    // Impacto: Tests más lentos pero sin fallos por concurrencia
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Force single process
      },
    },
    // Keep sequential execution within each file to avoid DB conflicts
    sequence: { shuffle: false },
    fileParallelism: false, // Force sequential file execution
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
