/**
 * Vitest config para unit tests (frontend)
 *
 * Arquitectura de testing:
 * - Unit tests: Vitest, al lado del archivo con .test.ts/.test.tsx
 * - E2E tests: Playwright, en tests/e2e/ con .spec.ts
 *
 * Coverage target: ≥80% (lines, functions, branches, statements)
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
    exclude: ['node_modules/**', '.next/**', 'out/**', 'dist/**'],
    // Parallelization is handled automatically by Vitest 4.x
    testTimeout: 10000, // 10 seconds default timeout
    hookTimeout: 10000,
    coverage: {
      provider: 'v8',
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
      '@': path.resolve(__dirname, './'),
      '@cactus/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
});
