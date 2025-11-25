/**
 * Visual regression tests for home page
 */

import { test, expect } from '@playwright/test';

test.describe('Home Page Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before taking screenshots
    const adminEmail = process.env.E2E_ADMIN_EMAIL || 'giolivosantarelli@gmail.com';
    const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'admin123';

    await page.goto('/login');
    await page.getByLabel(/email|usuario|correo/i).first().fill(adminEmail);
    await page.getByLabel(/contraseña|password/i).first().fill(adminPassword);
    await page.getByRole('button', { name: /ingresar|login|entrar/i }).click();
    await page.waitForURL(/(contacts|pipeline|portfolios|profile|analytics|benchmarks|\/)$/);
  });

  test('home page desktop view', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('home-desktop.png');
  });

  test('home page tablet view', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('home-tablet.png');
  });

  test('home page mobile view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('home-mobile.png');
  });
});

