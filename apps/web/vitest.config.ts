/**
 * Vitest config para unit tests (frontend)
 * 
 * Arquitectura de testing:
 * - Unit tests: Vitest, al lado del archivo con .test.ts/.test.tsx
 * - E2E tests: Playwright, en tests/e2e/ con .spec.ts
 * 
 * Coverage target: ≥60% (lines, functions, branches, statements)
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'dist/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['lib/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.d.ts',
        'app/layout.tsx',
        'app/page.tsx',
        'node_modules/**'
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    }
  }
});

