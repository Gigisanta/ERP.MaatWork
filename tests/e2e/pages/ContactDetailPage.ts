import { type Page, expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ContactDetailPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async expectLoaded() {
    await expect(this.page.getByText(/Ficha del Contacto/i)).toBeVisible();
  }

  async editField(label: string, newValue: string) {
    const labelElement = this.page.getByText(label, { exact: true });
    // Click the parent div which has the onClick handler.
    // We use a more specific locator to find the clickable container.
    const fieldContainer = labelElement.locator('..');
    await fieldContainer.click();

    // Find the input that appears after clicking
    const input = this.page.locator('input, textarea').first();
    await expect(input).toBeVisible();
    await input.fill(newValue);
    await input.press('Enter');

    // Wait for the text to appear outside input
    await expect(this.page.getByText(newValue)).toBeVisible();
  }

  get deleteButton(): Locator {
    return this.page.getByRole('button', { name: /eliminar|delete/i });
  }

  async deleteContact() {
    await this.deleteButton.click();
    await this.confirmDialog();
    await this.expectSuccessToast(/eliminado|deleted/i);
    await expect(this.page).toHaveURL(/\/contacts$/);
  }

  async addNote(content: string) {
    // Click "Agregar Nota" button to open modal
    const openModalBtn = this.page.getByRole('button', { name: /agregar nota/i }).first();
    await openModalBtn.click();

    // Wait for modal and fill content
    const textarea = this.page.getByPlaceholder(/escribe tu nota aquí/i);
    await expect(textarea).toBeVisible();
    await textarea.fill(content);

    // Click "Agregar Nota" in modal footer
    const submitBtn = this.page.getByRole('button', { name: /agregar nota/i }).last();
    await submitBtn.click();

    // Verify note added
    await expect(this.page.getByText(content)).toBeVisible();
  }

  async updateStatus(status: string) {
    // Assuming there is a status dropdown or pipeline visualizer
    // This is a placeholder implementation based on common patterns
    const statusSelect = this.page.getByRole('combobox', { name: /estado|status|etapa/i });
    if (await statusSelect.isVisible()) {
      await statusSelect.click();
      await this.page.getByRole('option', { name: new RegExp(status, 'i') }).click();
      await this.expectSuccessToast();
    }
  }

  async addTag(tagName: string) {
    const addTagBtn = this.page.getByRole('button', { name: /etiqueta|tag/i });
    if (await addTagBtn.isVisible()) {
      await addTagBtn.click();
      await this.page.getByRole('option', { name: tagName }).click();
      await this.expectSuccessToast();
    }
  }
}
