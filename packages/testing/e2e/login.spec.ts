import { test, expect } from '@playwright/test';
import { mockUsers } from '../fixtures/auth';

test.describe('Login Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1, h2')).toContainText(/login|iniciar sesión/i);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    
    // Fill invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrong-password');
    await page.click('button[type="submit"]');
    
    // Wait for error message
    await expect(page.locator('.error, [role="alert"]')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to dashboard after successful login', async ({ page, context }) => {
    // Mock successful auth
    await context.addCookies([
      {
        name: 'sb-access-token',
        value: 'mock-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/);
  });
});

