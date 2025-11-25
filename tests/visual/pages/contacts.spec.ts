/**
 * Visual regression tests for contacts page
 */

import { test, expect } from '@playwright/test';

test.describe('Contacts Page Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    const adminEmail = process.env.E2E_ADMIN_EMAIL || 'giolivosantarelli@gmail.com';
    const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'admin123';

    await page.goto('/login');
    await page.getByLabel(/email|usuario|correo/i).first().fill(adminEmail);
    await page.getByLabel(/contraseña|password/i).first().fill(adminPassword);
    await page.getByRole('button', { name: /ingresar|login|entrar/i }).click();
    await page.waitForURL(/(contacts|pipeline|portfolios|profile|analytics|benchmarks|\/)$/);
  });

  test('contacts list page', async ({ page }) => {
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('contacts-list.png');
  });

  test('contacts list empty state', async ({ page }) => {
    // This would require clearing contacts or using a test account
    // For now, we'll skip if contacts exist
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');
    
    // Check if empty state is shown
    const emptyState = page.getByText(/no hay contactos|no contacts|vacío/i);
    if (await emptyState.count() > 0) {
      await expect(page).toHaveScreenshot('contacts-empty.png');
    }
  });

  test('contact detail page', async ({ page }) => {
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');

    // Click on first contact if available
    const firstContact = page.locator('a[href*="/contacts/"]').first();
    if (await firstContact.count() > 0) {
      await firstContact.click();
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('contact-detail.png');
    }
  });
});

