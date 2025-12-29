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

  async openNewContactModal() {
    await this.gotoList();
    await this.newContactButton.click();
    await expect(this.page.getByRole('dialog')).toBeVisible();
  }

  async createContact(data: { firstName: string; lastName?: string; email?: string }) {
    await this.openNewContactModal();
    
    // Fill form
    await this.page.getByLabel(/nombre|first name/i).fill(data.firstName);
    if (data.lastName) {
      await this.page.getByLabel(/apellido|last name/i).fill(data.lastName);
    }
    if (data.email) {
      await this.page.getByLabel(/email|correo/i).first().fill(data.email);
    }

    // Submit
    await this.page.getByRole('button', { name: /guardar|save|crear/i }).click();
    
    // Wait for success
    await this.expectSuccessToast();
    
    // Dialog should close
    await expect(this.page.getByRole('dialog')).not.toBeVisible();
  }

  async editContact(name: string, newName: string) {
      await this.openContact(name);
      await this.page.getByRole('button', { name: /editar|edit/i }).click();
      await this.page.getByLabel(/nombre|first name/i).fill(newName);
      await this.page.getByRole('button', { name: /guardar|save/i }).click();
      await this.expectSuccessToast();
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
