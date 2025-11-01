import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL || 'giolivosantarelli@gmail.com';
const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'admin123';

test.describe('Auth and protected routes', () => {
  test('redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/contacts');
    await expect(page).toHaveURL(/\/login/);
  });

  test('can login and access protected page', async ({ page, context }) => {
    await page.goto('/login');

    // Best-effort selectors accommodating localized labels
    const emailInput = page.getByLabel(/email|usuario|correo/i).first();
    await emailInput.fill(adminEmail);

    const passwordInput = page.getByLabel(/contraseña|password/i).first();
    await passwordInput.fill(adminPassword);

    await page.getByRole('button', { name: /ingresar|login|entrar/i }).click();

    // Should land on a known protected area
    await expect(page).toHaveURL(/(contacts|pipeline|portfolios|profile|analytics|benchmarks|\/)$/);

    // Cookie for middleware should be present
    const cookies = await context.cookies();
    const tokenCookie = cookies.find((c: { name: string; value: string }) => c.name === 'token');
    expect(tokenCookie).toBeDefined();
  });
});





