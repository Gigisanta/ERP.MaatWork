// Note: vitest/config should be imported in actual vitest.config.ts files
// This file only exports shared configuration objects

import type { UserConfig } from 'vitest/config';

/**
 * Shared Vitest configuration for all apps
 * Note: This config should be used with defineConfig in actual vitest.config.ts files
 */
export const vitestConfig: Partial<UserConfig> = {
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
        '.next/',
      ],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
};

// Helper function to create vitest config with project-specific paths
export const createVitestConfig = (projectRoot: string) => ({
  ...vitestConfig,
  resolve: {
    alias: {
      '@cactus/shared': '../../packages/shared/index.ts',
      '@cactus/database': '../../packages/database/client.ts',
      '@cactus/testing': '../../packages/testing/index.ts',
      '@': `${projectRoot}/src`,
    },
  },
});

