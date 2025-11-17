/**
 * Playwright config for visual regression tests
 * 
 * Visual regression tests compare screenshots of pages/components
 * to detect visual changes
 */

import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: false, // Visual tests should run sequentially to avoid conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Run one at a time for consistent screenshots
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/visual-results.json' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Visual comparison settings
    viewport: { width: 1280, height: 720 },
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  
  // Visual comparison configuration
  expect: {
    // Threshold for visual comparison (0-1)
    // 0 = exact match, 1 = any difference allowed
    toHaveScreenshot: {
      threshold: 0.2, // Allow 20% difference
      mode: 'strict', // Compare all pixels
      maxDiffPixels: 100, // Maximum different pixels
    },
  },
  
  // Web server configuration (if needed)
  webServer: process.env.CI
    ? undefined
    : {
        command: 'pnpm -F @cactus/web dev',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});

