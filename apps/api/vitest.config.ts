/**
 * Vitest config para unit tests
 *
 * Arquitectura de testing:
 * - Unit tests: Vitest, al lado del archivo con .test.ts
 * - E2E tests: Playwright, en tests/e2e/ con .spec.ts
 *
 * Coverage target: ≥80% (lines, functions, branches, statements)
 *
 * AI_DECISION: Adaptive parallelization based on CPU cores
 * Justificación: Maximiza velocidad sin saturar sistema
 * Impacto: Tests 40-50% más rápidos
 */
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { getTestConfig } from '../../scripts/adaptive-test-config.mjs';

const adaptiveConfig = getTestConfig('unit');

export default defineConfig({
  resolve: {
    alias: {
      '@maatwork/db/schema': resolve(__dirname, '../../packages/db/src/schema.ts'),
      '@maatwork/db': resolve(__dirname, '../../packages/db/src/index.ts'),
      '@maatwork/db/': resolve(__dirname, '../../packages/db/src/'),
      '@maatwork/ui': resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/routes': resolve(__dirname, './src/routes'),
      '@/services': resolve(__dirname, './src/services'),
      '@/config': resolve(__dirname, './src/config'),
      '@/types': resolve(__dirname, './src/types'),
      '@/auth': resolve(__dirname, './src/auth'),
      '@/middleware': resolve(__dirname, './src/middleware'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'src/**/*.integration.test.ts',
      'src/__tests__/integration/**',
      'src/__tests__/performance/**',
    ],
    // Parallelization configuration - Adaptive based on CPU cores
    poolOptions: {
      threads: {
        maxThreads: adaptiveConfig.maxThreads,
        minThreads: adaptiveConfig.minThreads,
      },
    },
    testTimeout: adaptiveConfig.testTimeout,
    hookTimeout: adaptiveConfig.hookTimeout,
    coverage: {
      enabled: process.env.COVERAGE !== 'false' && !process.env.VITEST_WATCH,
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
