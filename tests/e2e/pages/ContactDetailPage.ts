import { type Page, expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ContactDetailPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async expectLoaded() {
    await expect(this.page.getByRole('heading', { level: 1 })).toBeVisible();
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
    // Switch to notes tab if necessary
    const notesTab = this.page.getByRole('tab', { name: /notas|notes/i });
    if (await notesTab.isVisible()) {
      await notesTab.click();
    }
    
    await this.page.getByPlaceholder(/escriba una nota|write a note/i).fill(content);
    await this.page.getByRole('button', { name: /agregar|add|guardar/i }).click();
    
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
