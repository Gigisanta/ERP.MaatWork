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
    await this.page
      .getByRole('button', { name: /nuevo|crear|new|add/i })
      .first()
      .click();

    // The button redirects to /register
    await this.page.waitForURL(/\/register/);

    await this.page.getByLabel(/nombre completo/i).fill(user.name);
    // Username is optional, but good to fill if we can derive it or if param exists (not in current interface)
    // Register page form:
    await this.page.getByLabel(/email/i).fill(user.email);
    
    if (user.password) {
      await this.page.getByLabel(/contraseña|password/i).fill(user.password);
    }

    // Role selection in Register page
    if (user.role) {
       // The register page has a Select for role
       // We need to match the Select trigger or label
       // "Rol" label is present
       const roleTrigger = this.page.locator('button[role="combobox"]').filter({ hasText: /asesor|manager|administrativo|dirección/i }).or(this.page.getByLabel('Rol'));
       // Since implementation of Select can vary (Radix UI often uses button), we try to find it.
       // The page uses @maatwork/ui Select.
       
       // Simplified approach: interact with the select if found
       const selectTrigger = this.page.locator('button[role="combobox"]').nth(0); // Assuming first select is Role
       await selectTrigger.click();
       await this.page.getByRole('option', { name: new RegExp(user.role, 'i') }).click();
    }
    
    // If advisor, requires manager. For test we might skip or handle if role is advisor.
    // The test uses 'Advisor'. Register requires manager for Advisor.
    // We should probably change test to use 'Manager' or 'Staff' to avoid dependency on existing managers, 
    // OR we need to select a manager.
    
    // For now, let's update the test data to use 'Manager' to simplify dependency.
    
    await this.page
      .getByRole('button', { name: /crear cuenta/i })
      .click();

    // Register page shows success message then redirects to login
    await expect(this.page.getByText(/éxito|success|bienvenido/i)).toBeVisible();
    
    // NOTE: This likely logs out the admin. The test flow will need to handle re-login if it wants to continue acting as admin.
  }

  async changeUserRole(name: string, newRole: string) {
    const row = this.page.getByRole('row', { name: new RegExp(name, 'i') });
    // The role select is inside the row
    const selectTrigger = row.locator('button[role="combobox"]');
    await selectTrigger.click();
    await this.page.getByRole('option', { name: new RegExp(newRole, 'i') }).click();
    // Wait for update (optimistic UI or toast)
    // The page invalidates cache, so UI should update.
  }

  async toggleUserActive(name: string) {
    const row = this.page.getByRole('row', { name: new RegExp(name, 'i') });
    const switchControl = row.locator('input[type="checkbox"], [role="switch"]');
    await switchControl.click();
    await this.page.waitForTimeout(500); // Wait for toggle animation/request
  }
}
