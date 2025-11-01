import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: [
      'src/**/*.e2e.test.ts',  // Excluir tests E2E (requieren setup adicional)
      'src/**/*.spec.ts',      // Excluir specs (si existen)
      'src/__tests__/**',      // Excluir directorio __tests__ (E2E antiguos)
      'node_modules/**'
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

