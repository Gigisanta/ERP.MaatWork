import { test, expect } from './fixtures';

test.describe('Auth and Session Management', () => {
  // This test uses the storageState from globalSetup
  test('is already authenticated by global setup', async ({ authPage }) => {
    await authPage.goto('/');
    await authPage.expectToBeLoggedIn();
  });

  test('can logout successfully', async ({ authPage }) => {
    await authPage.goto('/');
    await authPage.logout();
    await authPage.expectToBeLoggedOut();
  });

  // Test the login UI explicitly by clearing state
  test.describe('Login UI Smoke Test', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('redirects to login when unauthenticated', async ({ authPage, page }) => {
      await authPage.goto('/contacts');
      await expect(page).toHaveURL(/\/login/);
    });

    test('shows error on invalid credentials', async ({ authPage, page }) => {
      await authPage.gotoLogin();

      // Using page directly for negative test specific elements or extend AuthPage if this is common
      await page
        .getByLabel(/email|usuario|correo/i)
        .first()
        .fill('wrong@example.com');
      await page
        .getByLabel(/contraseña|password/i)
        .first()
        .fill('wrongpassword');
      await page.getByRole('button', { name: /ingresar|login|entrar|iniciar sesión/i }).click();

      // Look for error message
      await expect(page.getByText(/error|inválido|invalid/i).first()).toBeVisible();
    });

    test('can login with valid credentials', async ({ authPage }) => {
      // We use the credentials from the env or default fallback as defined in AuthPage
      await authPage.login();
      await authPage.expectToBeLoggedIn();
    });
  });

  test.describe('Advanced Session Scenarios', () => {
    test('handles session timeout (cookie expiry)', async ({ authPage, context }) => {
      await authPage.goto('/');
      await context.clearCookies();
      await authPage.reload();
      await authPage.expectToBeLoggedOut();
    });

    test('admin role access check', async ({ authPage, page }) => {
      await authPage.goto('/admin');
      // Admin should have access
      await expect(page).not.toHaveURL(/\/login/);
    });
  });
});
