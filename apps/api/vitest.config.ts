/**
 * Vitest config para unit tests
 *
 * Arquitectura de testing:
 * - Unit tests: Vitest, al lado del archivo con .test.ts
 * - E2E tests: Playwright, en tests/e2e/ con .spec.ts
 *
 * Coverage target: ≥80% (lines, functions, branches, statements)
 */
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@cactus/db': resolve(__dirname, '../../packages/db/src/index.ts'),
      '@cactus/db/schema': resolve(__dirname, '../../packages/db/src/schema.ts'),
      '@cactus/ui': resolve(__dirname, '../../packages/ui/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'src/**/*.integration.test.ts', // Exclude integration tests from unit test runs
    ],
    // Parallelization configuration
    threads: true,
    maxConcurrency: 5,
    minThreads: 1,
    maxThreads: 4,
    testTimeout: 10000, // 10 seconds default timeout
    hookTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.e2e.test.ts',
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
