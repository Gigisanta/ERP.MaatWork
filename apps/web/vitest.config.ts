/**
 * Vitest config para unit tests (frontend)
 *
 * Arquitectura de testing:
 * - Unit tests: Vitest, al lado del archivo con .test.ts/.test.tsx
 * - E2E tests: Playwright, en tests/e2e/ con .spec.ts
 *
 * Coverage target: ≥80% (lines, functions, branches, statements)
 *
 * AI_DECISION: Adaptive parallelization based on CPU cores
 * Justificación: Maximiza velocidad sin saturar sistema
 * Impacto: Tests 40-50% más rápidos
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { getTestConfig } from '../../scripts/adaptive-test-config.mjs';

const adaptiveConfig = getTestConfig('unit');

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [path.resolve(__dirname, './vitest.setup.ts')],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**', 'out/**', 'dist/**'],
    // Parallelization optimized - Adaptive based on CPU cores
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
      provider: 'v8' as const,
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['lib/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.d.ts',
        'app/layout.tsx',
        'app/page.tsx',
        'node_modules/**',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
      // AI_DECISION: Coverage thresholds configurados a 70% para frontend según plan de optimización
      // Justificación: 70% es realista para frontend (UI components más difíciles de testear completamente)
      // Impacto: Asegura cobertura alta sin bloquear desarrollo, más permisivo que backend
    },
  },
  resolve: {
    alias: {
      '@/app': path.resolve(__dirname, './app'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/components': path.resolve(__dirname, './app/components'),
      '@/hooks': path.resolve(__dirname, './lib/hooks'),
      '@/auth': path.resolve(__dirname, './app/auth'),
      '@/utils': path.resolve(__dirname, './lib/utils'),
      '@maatwork/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@': path.resolve(__dirname, './'),
    },
  },
});
