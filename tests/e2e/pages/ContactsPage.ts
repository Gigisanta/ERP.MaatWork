import { type Page, expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ContactsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async gotoList() {
    await this.goto('/contacts');
  }

  get newContactButton(): Locator {
    return this.page.getByRole('button', { name: /nuevo|new|crear/i }).first();
  }

  get searchInput(): Locator {
    return this.page.getByPlaceholder(/buscar|search/i).first();
  }

  async openNewContactPage() {
    await this.gotoList();
    await this.newContactButton.click();
    await expect(this.page).toHaveURL(/\/contacts\/new/);
  }

  async createContact(data: { firstName: string; lastName: string; email?: string }) {
    await this.openNewContactPage();

    // Fill form using placeholders
    const firstNameInput = this.page.getByPlaceholder('Juan', { exact: true });
    await firstNameInput.fill(data.firstName);
    await firstNameInput.press('Tab');

    const lastNameInput = this.page.getByPlaceholder('Pérez', { exact: true });
    await lastNameInput.fill(data.lastName);
    await lastNameInput.press('Tab');

    if (data.email) {
      const emailInput = this.page.getByPlaceholder('juan.perez@email.com', { exact: true });
      await emailInput.fill(data.email);
      await emailInput.press('Tab');
    }

    // Wait for validation to settle
    await this.page.waitForTimeout(1000);

    // Submit
    const submitBtn = this.page.getByRole('button', { name: /crear contacto/i });

    // Log state for debugging if possible
    const isDisabled = await submitBtn.isDisabled();
    if (isDisabled) {
      console.log('DEBUG: Submit button is disabled. Checking for error messages...');
      const errors = await this.page.locator('.text-error').allTextContents();
      console.log('DEBUG: Error messages found:', errors);
    }

    await expect(submitBtn).toBeEnabled({ timeout: 10000 });
    await submitBtn.click();

    // Wait for redirect to /contacts
    await expect(this.page).toHaveURL(/\/contacts(\?.*)?$/, { timeout: 30000 });
  }

  async deleteContact(name: string) {
    await this.gotoList();
    await this.searchContact(name);

    const row = this.page.getByRole('row', { name: new RegExp(name, 'i') }).first();
    await row
      .getByRole('button')
      .filter({ has: this.page.locator('svg') })
      .last()
      .click();
    await this.page.getByRole('menuitem', { name: /eliminar/i }).click();

    await this.confirmDialog();
    await this.expectSuccessToast(/eliminado/i);
  }

  async editContact(name: string, newName: string) {
    await this.gotoList();
    await this.searchContact(name);
    const row = this.page.getByRole('row', { name: new RegExp(name, 'i') }).first();
    await row
      .getByRole('button')
      .filter({ has: this.page.locator('svg') })
      .last()
      .click();
    await this.page.getByRole('menuitem', { name: /editar/i }).click();

    await expect(this.page).toHaveURL(/\/contacts\/\w+/);
    // On detail page, we need to find the editable field or edit button
    // But for now, let's assume we use the detail page object for editing
  }

  async openContact(name: string) {
    // Assuming the list has links with the contact name
    // We search first to ensure it's visible
    await this.searchContact(name);
    const link = this.page.getByRole('link', { name: new RegExp(name, 'i') }).first();
    await link.click();
    await expect(this.page).toHaveURL(/\/contacts\//);
  }

  async searchContact(term: string) {
    await this.searchInput.fill(term);
    // Wait for network idle or list update indicator
    // Ideally we wait for a specific list container to update, but simple wait for now
    await this.page.waitForTimeout(500);
  }

  async expectContactInList(name: string) {
    await expect(this.page.getByText(name).first()).toBeVisible();
  }

  async addTag(tagName: string) {
    // Assuming we are on detail page or using list action
    // For this implementation, assume Detail Page action is called from here for simplicity or moved to DetailPage
    // But typically this belongs in DetailPage if it's done there.
    // Let's implement it in ContactDetailPage instead.
  }
}
