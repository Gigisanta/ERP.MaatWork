/**
 * Visual regression tests para página de admin users
 */

import { test, expect } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL || 'giolivosantarelli@gmail.com';
const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'admin123';

async function login(page: any) {
  await page.goto('/login');
  const emailInput = page.getByLabel(/email|usuario|correo/i).first();
  await emailInput.fill(adminEmail);
  const passwordInput = page.getByLabel(/contraseña|password/i).first();
  await passwordInput.fill(adminPassword);
  await page.getByRole('button', { name: /ingresar|login|entrar/i }).click();
  await expect(page).toHaveURL(/(contacts|pipeline|portfolios|profile|analytics|benchmarks|\/)$/);
}

test.describe('Admin Users Page Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('debería capturar screenshot de admin users page', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-users-page.png', { fullPage: true });
  });
});

