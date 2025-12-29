import { type Page, expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async gotoUsers() {
    await this.goto('/admin/users');
  }

  async gotoSettings() {
      await this.goto('/admin/settings');
      await expect(this.page.getByText(/configuración|settings|ajustes/i)).toBeVisible();
  }

  async gotoAdvisorSettings() {
      await this.goto('/admin/settings/aum-advisors');
      await expect(this.page.getByText(/advisors|asesores|configuración/i)).toBeVisible();
  }

  async createUser(user: { email: string; name: string; password?: string; role?: string }) {
    await this.page.getByRole('button', { name: /nuevo|crear|new|add/i }).first().click();
    
    await this.page.getByLabel(/email/i).fill(user.email);
    await this.page.getByLabel(/nombre|name/i).fill(user.name);
    
    if (user.password) {
      await this.page.getByLabel(/contraseña|password/i).fill(user.password);
    }
    
    if (user.role) {
      const roleSelect = this.page.getByLabel(/rol|role/i);
      // Try to select by value or label, handling different select implementations
      // Fallback: click and select option
      await roleSelect.selectOption({ label: user.role }).catch(() => 
          roleSelect.selectOption({ value: user.role.toLowerCase() })
      ).catch(async () => {
          // Custom select fallback
          await roleSelect.click();
          await this.page.getByRole('option', { name: new RegExp(user.role!, 'i') }).click();
      });
    }

    await this.page.getByRole('button', { name: /guardar|save/i }).first().click();
    await this.expectSuccessToast(/éxito|success|creado/i);
  }

  async editUser(name: string, newName: string) {
    // Find row with user name
    const row = this.page.getByRole('row', { name: new RegExp(name, 'i') });
    await row.getByRole('button', { name: /editar|edit/i }).click();
    
    await this.page.getByLabel(/nombre|name/i).fill(newName);
    await this.page.getByRole('button', { name: /guardar|save/i }).first().click();
    await this.expectSuccessToast();
  }

  async toggleUserActive(name: string) {
    const row = this.page.getByRole('row', { name: new RegExp(name, 'i') });
    const switchControl = row.locator('input[type="checkbox"], [role="switch"]');
    await switchControl.click();
    await this.page.waitForTimeout(500); // Wait for toggle animation/request
  }
}

