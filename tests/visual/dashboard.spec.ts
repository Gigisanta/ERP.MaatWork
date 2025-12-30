import { test, expect } from '@playwright/test';
import { AuthPage } from '../e2e/pages/AuthPage';

// We can't use the same fixtures easily across different config setups if they depend on specific test runners,
// but we can reuse the POM classes.

test.describe('Visual Regression', () => {
  test('dashboard visual snapshot', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.login();

    await page.goto('/');
    // Wait for data to load
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('dashboard.png');
  });

  test('login page visual snapshot', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveScreenshot('login.png');
  });
});
