import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars for the config itself if needed
dotenv.config();

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/CRM';
const TEST_DB_URL = DB_URL.replace(/\/([^/]+)$/, '/CRM_TEST');

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: path.resolve(__dirname, './tests/e2e/global-setup.ts'),
  retries: process.env.CI ? 2 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    storageState: path.resolve(__dirname, './tests/e2e/.auth/user.json'),
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: {
    command: 'pnpm dev:basic',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      DATABASE_URL: TEST_DB_URL,
      NODE_ENV: 'test',
    },
  },
});
