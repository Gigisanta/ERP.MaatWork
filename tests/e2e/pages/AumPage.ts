import { type Page, expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import path from 'path';

export class AumPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async gotoAdmin() {
    await this.goto('/admin/aum');
  }

  async gotoRows() {
    await this.goto('/admin/aum/rows');
    // Ensure table or empty state is loaded
    await expect(this.page.locator('table, .empty-state')).toBeVisible();
  }

  get fileInput(): Locator {
    return this.page.locator('input[type="file"]');
  }

  get commitButton(): Locator {
    return this.page.getByRole('button', { name: /commit|confirmar|guardar/i });
  }

  get reviewButton(): Locator {
    return this.page.getByRole('button', { name: /revisar|review|verificar/i });
  }

  get purgeButton(): Locator {
    return this.page.getByRole('button', { name: /purge|limpiar|eliminar/i });
  }

  async uploadFile(filePath: string) {
    const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    await this.fileInput.setInputFiles(absPath);
    // Wait for processing indicator
    await expect(this.page.getByText(/subido|uploaded|procesando/i)).toBeVisible();
    // Wait for processing to finish (usually status changes)
    await this.page.waitForTimeout(1000); // Give it a moment to react
  }

  async verifyParsed() {
    await expect(this.page.getByText(/parsed|procesado/i)).toBeVisible();
  }

  async reviewMatches() {
    await this.reviewButton.click();
    await expect(this.page.getByText(/matched|coincidencias/i)).toBeVisible();
  }

  async commitImport() {
    await this.commitButton.click();
    await this.expectSuccessToast(/éxito|success|committed/i);
  }

  async uploadMapping(filePath: string) {
    const mappingTab = this.page.getByRole('tab', { name: /mapping|mapeo|asesor/i });
    await mappingTab.click();
    await this.uploadFile(filePath);
    await this.expectSuccessToast(/mapeo|mapping|procesado/i);
  }

  async purgeImport() {
    await this.purgeButton.click();
    await this.confirmDialog();
    await this.expectSuccessToast(/eliminado|purged|limpiado/i);
  }

  async resolveConflicts() {
     const resolveButton = this.page.getByRole('button', { name: /resolver|resolve/i });
     await resolveButton.click();
     // Assume dialog or action completes
     await this.page.waitForTimeout(500);
  }

  // Rows specific methods
  async filterByBroker(brokerName: string) {
      const select = this.page.locator('select').filter({ hasText: /Todos los Brokers|All Brokers/i }).or(this.page.locator('select').first());
      await select.click();
      await this.page.getByRole('option', { name: new RegExp(brokerName, 'i') }).click();
      await this.page.waitForTimeout(500); // Wait for filter
  }

  async filterByStatus(status: string) {
      // Assuming status selector is distinguishable or 2nd select
      // A more robust way would be looking for label
      const select = this.page.locator('select').filter({ hasText: /Todos los Estados|All Status/i }).or(this.page.locator('select').nth(1));
      await select.click();
      await this.page.getByRole('option', { name: new RegExp(status, 'i') }).click();
      await this.page.waitForTimeout(500);
  }

  async searchRow(term: string) {
      const search = this.page.getByPlaceholder(/buscar|search/i);
      await search.fill(term);
      await this.page.waitForTimeout(500); // Debounce
  }

  async toggleUpdatedOnly() {
      const checkbox = this.page.getByLabel(/solo actualizados|updated only/i).or(this.page.locator('input[type="checkbox"]').first());
      await checkbox.click();
  }

  async expectHistoryPage() {
      await expect(this.page).toHaveURL(/\/history/);
  }
}
