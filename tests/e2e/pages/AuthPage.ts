import { type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AuthPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async gotoLogin() {
    await this.goto('/login');
  }

  async login(email: string = 'admin@example.com', password: string = 'admin123') {
    await this.gotoLogin();
    
    // Using loose matchers for resilience, but in a real app ideally use data-testid
    await this.page.getByLabel(/email|usuario|correo/i).fill(email);
    await this.page.getByLabel(/contraseña|password/i).fill(password);
    
    await this.page.getByRole('button', { name: /ingresar|login|entrar|iniciar sesión/i }).click();
    
    // Wait for navigation away from login
    await expect(this.page).not.toHaveURL(/\/login/);
  }

  async logout() {
    // Attempt to find logout button in various common locations (sidebar, profile menu)
    // This assumes the sidebar is visible or there is a user menu
    const logoutBtn = this.page.getByRole('button', { name: /salir|logout|cerrar sesión/i });
    
    // Check if we need to open a menu first (if logout is not immediately visible)
    if (await logoutBtn.count() === 0) {
      const userMenu = this.page.getByRole('button', { name: /profile|cuenta|usuario/i });
      if (await userMenu.count() > 0) {
        await userMenu.click();
      }
    }

    await logoutBtn.click();
    await expect(this.page).toHaveURL(/\/login/);
  }

  async expectToBeLoggedIn() {
    // Check for common authenticated UI elements
    await expect(this.page.locator('aside, [role="navigation"], .sidebar').first()).toBeVisible();
    await expect(this.page).not.toHaveURL(/\/login/);
  }

  async expectToBeLoggedOut() {
    await expect(this.page).toHaveURL(/\/login/);
  }
}

