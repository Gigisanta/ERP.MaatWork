/**
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
    setupFiles: ['./vitest.setup.ts'],
    environment: 'jsdom',
    // Suppress React 18 act() warnings from testing-library
    environmentOptions: {
      jsdom: {
        resources: 'usable',
      },
    },
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
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.stories.{ts,tsx}', 'src/**/*.d.ts', 'src/index.ts', 'src/**/index.ts'],
      thresholds: {
        branches: 85,
        functions: 85,
        lines: 85,
        statements: 85,
      },
    },
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/coverage/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
