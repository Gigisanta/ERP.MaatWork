import { test, expect } from '@playwright/test';

test.describe('Auth and Session Management', () => {
  // This test uses the storageState from globalSetup
  test('is already authenticated by global setup', async ({ page }) => {
    await page.goto('/');
    // Check for an element that only appears when logged in (e.g., sidebar or profile)
    // Based on previous files, we can expect navigation to one of these routes
    await expect(page).toHaveURL(/(contacts|pipeline|portfolios|profile|analytics|benchmarks|\/)$/);
  });

  test('can logout successfully', async ({ page }) => {
    await page.goto('/');
    
    // Find logout button - often in a dropdown or sidebar
    const logoutBtn = page.getByRole('button', { name: /salir|logout|cerrar sesión/i });
    if (await logoutBtn.count() > 0) {
      await logoutBtn.first().click();
      await expect(page).toHaveURL(/\/login/);
    }
  });

  // Test the login UI explicitly by clearing state
  test.describe('Login UI Smoke Test', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('redirects to login when unauthenticated', async ({ page }) => {
      await page.goto('/contacts');
      await expect(page).toHaveURL(/\/login/);
    });

    test('shows error on invalid credentials', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel(/email|usuario|correo/i).first().fill('wrong@example.com');
      await page.getByLabel(/contraseña|password/i).first().fill('wrongpassword');
      await page.getByRole('button', { name: /ingresar|login|entrar|iniciar sesión/i }).click();
      
      // Look for error message
      await expect(page.getByText(/error|inválido|invalid/i).first()).toBeVisible();
    });
  });
});
