import { type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AuthPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async gotoLogin() {
    await this.goto('/login');
  }

  async login(email: string = 'admin@grupoabax.com', password: string = 'password123') {
    // Check if we are already logged in by looking for authenticated elements or URL
    const isAuthenticated = await this.page.evaluate(() => {
      // Check for a common global object or cookie if possible,
      // but authenticated elements are more reliable in E2E.
      // Even if hidden, they should be in the DOM.
      return !!document.querySelector(
        'aside, [role="navigation"], .sidebar, button[aria-label*="Menú de usuario"]'
      );
    });

    // If we're already logged in, we might not need to login again
    if (isAuthenticated) {
      // If we are already on a dashboard page and it's not what we're trying to test (explicit login), return
      if (!this.page.url().includes('/login')) {
        return;
      }
    }

    await this.gotoLogin();

    // After gotoLogin, check if we were automatically redirected (already logged in)
    if (!this.page.url().includes('/login')) {
      console.log('Already logged in, redirected away from login page.');
      return;
    }

    // Using more specific locators to avoid matching header user menu
    const emailInput = this.page
      .locator('input#identifier, input[name="identifier"], input[placeholder*="email"]')
      .first();
    const passwordInput = this.page
      .locator('input#password, input[name="password"], input[type="password"]')
      .first();

    await emailInput.fill(email);
    await passwordInput.fill(password);

    await this.page.getByRole('button', { name: /ingresar|login|entrar|iniciar sesión/i }).click();

    // Wait for navigation away from login
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: 15000 });
  }

  async logout() {
    // 1. Try to find the user menu button in the header
    const userMenu = this.page
      .locator(
        'button[aria-label*="Menú de usuario"], button:has-text("usuario"), .user-menu-trigger'
      )
      .first();
    if (await userMenu.isVisible()) {
      await userMenu.click();
    }

    // 2. Look for logout button in the menu or sidebar
    const logoutBtn = this.page
      .getByRole('button', { name: /salir|logout|cerrar sesión/i })
      .first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
    } else {
      // Fallback: direct navigation to logout if available, or clear cookies
      await this.page.context().clearCookies();
      await this.gotoLogin();
    }

    await expect(this.page).toHaveURL(/\/login/);
  }

  async expectToBeLoggedIn() {
    // Check for elements that indicate we are logged in.
    // On desktop, the sidebar is visible. On mobile, it's hidden but the user menu button is visible.
    const isMobile = await this.page.evaluate(() => window.innerWidth < 1024);

    if (isMobile) {
      // On mobile, sidebar is hidden, so we check for the header or user menu button
      await expect(
        this.page
          .locator('header, button[aria-label*="Menú de usuario"], .user-menu-trigger')
          .first()
      ).toBeVisible();
    } else {
      // On desktop, sidebar should be visible
      await expect(this.page.locator('aside, [role="navigation"], .sidebar').first()).toBeVisible();
    }

    await expect(this.page).not.toHaveURL(/\/login/);
  }

  async expectToBeLoggedOut() {
    await expect(this.page).toHaveURL(/\/login/);
  }
}
