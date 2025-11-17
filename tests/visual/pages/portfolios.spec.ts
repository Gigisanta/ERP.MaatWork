/**
 * Visual regression tests for portfolios page
 */

import { test, expect } from '@playwright/test';

test.describe('Portfolios Page Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    const adminEmail = process.env.E2E_ADMIN_EMAIL || 'giolivosantarelli@gmail.com';
    const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'admin123';

    await page.goto('/login');
    await page.getByLabel(/email|usuario|correo/i).first().fill(adminEmail);
    await page.getByLabel(/contraseña|password/i).first().fill(adminPassword);
    await page.getByRole('button', { name: /ingresar|login|entrar/i }).click();
    await page.waitForURL(/(contacts|pipeline|portfolios|profile|analytics|benchmarks|\/)$/);
  });

  test('portfolios list page', async ({ page }) => {
    await page.goto('/portfolios');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('portfolios-list.png');
  });

  test('portfolio detail page', async ({ page }) => {
    await page.goto('/portfolios');
    await page.waitForLoadState('networkidle');

    // Click on first portfolio if available
    const firstPortfolio = page.locator('a[href*="/portfolios/"]').first();
    if (await firstPortfolio.count() > 0) {
      await firstPortfolio.click();
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('portfolio-detail.png');
    }
  });
});

