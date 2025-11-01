import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
      ],
    },
  },
  resolve: {
    alias: {
      '@cactus/shared': resolve(__dirname, '../../packages/shared/index.ts'),
      '@cactus/database': resolve(__dirname, '../../packages/database/client.ts'),
      '@cactus/testing': resolve(__dirname, '../../packages/testing/index.ts'),
    },
  },
});

