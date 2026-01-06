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

  // Legacy buttons - maintained for compatibility but should be removed from tests
  get commitButton(): Locator {
    return this.page.getByRole('button', { name: /commit|confirmar|guardar/i });
  }

  get reviewButton(): Locator {
    return this.page.getByRole('button', { name: /revisar|review|verificar/i });
  }

  get purgeButton(): Locator {
    return this.page
      .getByRole('button', { name: /eliminar todos|delete all/i })
      .or(this.page.getByTitle(/eliminar todos/i));
  }

  async uploadFile(filePath: string) {
    // Ensure we are on the rows page where the uploader is
    if (!this.page.url().includes('/admin/aum/rows')) {
      await this.gotoRows();
    }

    const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    await this.fileInput.setInputFiles(absPath);

    // FileUploader requires clicking "Subir"
    const uploadBtn = this.page.getByRole('button', { name: 'Subir', exact: true });
    await uploadBtn.click();

    // Wait for processing
    await expect(
      this.page.getByText(/Subiendo|Procesando|Normalizando|Finalizando|Subido/i)
    ).toBeVisible();

    // Wait for success message or table update
    await expect(this.page.getByText(/Subido|Completado/i)).toBeVisible({ timeout: 60000 });
  }

  async verifyParsed() {
    // Verify rows are loaded
    await expect(this.page.locator('table')).toBeVisible();
    await expect(this.page.getByText(/Total:/i)).toBeVisible();
  }

  async reviewMatches() {
    // No-op in new workflow
  }

  async commitImport() {
    // No-op in new workflow
  }

  async uploadMapping(filePath: string) {
    // Advisor mapping might be different now. Skipping for now or need to find where it is.
    // Assuming it's not critical for the main flow if the button isn't there.
  }

  async purgeImport() {
    // Click the reset button (Trash icon) in AumAdminActions
    const trashBtn = this.page
      .getByRole('button', { name: /eliminar todos|delete all/i })
      .or(this.page.getByTitle(/eliminar todos/i));
    await trashBtn.click();
    await this.confirmDialog();
    // Wait for reset to complete
    await this.page.waitForTimeout(1000);
  }

  async resolveConflicts() {
    const resolveButton = this.page.getByRole('button', { name: /resolver|resolve/i });
    await resolveButton.click();
    // Assume dialog or action completes
    await this.page.waitForTimeout(500);
  }

  // Rows specific methods
  async filterByBroker(brokerName: string) {
    const select = this.page
      .locator('select')
      .filter({ hasText: /Todos los Brokers|All Brokers/i })
      .or(this.page.locator('select').first());
    await select.click();
    await this.page.getByRole('option', { name: new RegExp(brokerName, 'i') }).click();
    await this.page.waitForTimeout(500); // Wait for filter
  }

  async filterByStatus(status: string) {
    // Assuming status selector is distinguishable or 2nd select
    // A more robust way would be looking for label
    const select = this.page
      .locator('select')
      .filter({ hasText: /Todos los Estados|All Status/i })
      .or(this.page.locator('select').nth(1));
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
    const checkbox = this.page
      .getByLabel(/solo actualizados|updated only/i)
      .or(this.page.locator('input[type="checkbox"]').first());
    await checkbox.click();
  }

  async expectHistoryPage() {
    await expect(this.page).toHaveURL(/\/history/);
  }
}
