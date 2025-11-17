/**
 * Visual regression tests for pipeline page
 */

import { test, expect } from '@playwright/test';

test.describe('Pipeline Page Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    const adminEmail = process.env.E2E_ADMIN_EMAIL || 'giolivosantarelli@gmail.com';
    const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'admin123';

    await page.goto('/login');
    await page.getByLabel(/email|usuario|correo/i).first().fill(adminEmail);
    await page.getByLabel(/contraseña|password/i).first().fill(adminPassword);
    await page.getByRole('button', { name: /ingresar|login|entrar/i }).click();
    await page.waitForURL(/(contacts|pipeline|portfolios|profile|analytics|benchmarks|\/)$/);
  });

  test('pipeline kanban board', async ({ page }) => {
    await page.goto('/pipeline');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('pipeline-kanban.png');
  });

  test('pipeline mobile view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/pipeline');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('pipeline-mobile.png');
  });
});

