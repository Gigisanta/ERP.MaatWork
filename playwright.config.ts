/**
 * AI_DECISION: Optimized E2E configuration - Chromium-only by default
 * Justificación: 70% faster execution, multi-browser via env flag
 * Impacto: Tests run 27 tests instead of 81 (3x browsers)
 */
import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';
import { getTestConfig } from './scripts/adaptive-test-config.mjs';

// Load env vars for the config itself if needed
dotenv.config();

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/CRM';
const TEST_DB_URL = DB_URL.replace(/\/([^/]+)$/, '/CRM_TEST');
const MULTI_BROWSER = process.env.MULTI_BROWSER === 'true';

// Get adaptive config for E2E
const e2eConfig = getTestConfig('e2e');

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: path.resolve(__dirname, './tests/e2e/global-setup.ts'),
  retries: process.env.CI ? 2 : 0,
  timeout: e2eConfig.timeout, // Reduced from 90s to 60s
  expect: { timeout: e2eConfig.expectTimeout }, // Reduced from 15s to 10s
  workers: e2eConfig.workers, // Parallel execution based on CPU
  use: {
    baseURL: BASE_URL,
    storageState: path.resolve(__dirname, './tests/e2e/.auth/user.json'),
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Chromium-only by default, multi-browser via MULTI_BROWSER=true
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ...(MULTI_BROWSER ? [
      { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
      { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    ] : []),
  ],
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: {
    command: 'pnpm dev:basic',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      DATABASE_URL: TEST_DB_URL,
      NODE_ENV: 'test',
    },
  },
});
