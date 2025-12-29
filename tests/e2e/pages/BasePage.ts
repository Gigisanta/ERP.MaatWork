import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Base Page Object Model
 * Contains common methods and properties shared across all pages.
 */
export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific path
   */
  async goto(path: string) {
    await this.page.goto(path);
  }

  /**
   * Get the toast message locator
   */
  get toastMessage(): Locator {
    return this.page.locator('[role="status"], .toast, [data-testid="toast-message"]');
  }

  /**
   * Assert a success toast is visible
   */
  async expectSuccessToast(message?: string | RegExp) {
    const toast = this.toastMessage.first();
    await expect(toast).toBeVisible();
    if (message) {
      await expect(toast).toContainText(message);
    }
  }

  /**
   * Handle standard confirmation dialogs
   */
  async confirmDialog() {
    const confirmBtn = this.page.getByRole('button', { name: /confirmar|sí|yes|delete|eliminar/i }).last();
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();
  }

  /**
   * Wait for URL to match a regex or string
   */
  async waitForURL(url: string | RegExp) {
    await this.page.waitForURL(url);
  }

  /**
   * Reload the page
   */
  async reload() {
    await this.page.reload();
  }
}

