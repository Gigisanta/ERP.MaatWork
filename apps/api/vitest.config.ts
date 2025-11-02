/**
 * Vitest config para unit tests
 * 
 * Arquitectura de testing:
 * - Unit tests: Vitest, al lado del archivo con .test.ts
 * - E2E tests: Playwright, en tests/e2e/ con .spec.ts
 * 
 * Coverage target: ≥70% (lines, functions, branches, statements)
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: [
      'node_modules/**',
      'dist/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.e2e.test.ts',
        'src/**/*.d.ts',
        'src/index.ts',
        'src/types/**',
        'src/__tests__/**'
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70
      }
    }
  }
});

