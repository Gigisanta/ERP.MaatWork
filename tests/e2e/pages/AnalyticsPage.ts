import { type Page, expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class AnalyticsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async gotoDashboard() {
    await this.goto('/analytics');
  }

  async gotoBenchmarks() {
    await this.goto('/benchmarks');
  }

  async expectChartsVisible() {
     // Check for canvas elements or chart containers
     await expect(this.page.locator('canvas, [data-testid="chart-container"]').first()).toBeVisible();
  }

  async expectMetric(label: string, value?: string) {
     const metricCard = this.page.locator('.metric-card').filter({ hasText: label });
     await expect(metricCard).toBeVisible();
     if (value) {
         await expect(metricCard).toContainText(value);
     }
  }

  async syncInstruments() {
      // Assuming a manual sync button exists for testing or admin purposes
      await this.goto('/admin/instruments');
      await this.page.getByRole('button', { name: /sync|sincronizar/i }).click();
      await this.expectSuccessToast(/sincronizado|synced/i);
  }

  async checkInstrumentPrice(ticker: string, price: RegExp | string) {
      await this.gotoBenchmarks();
      const row = this.page.getByRole('row', { name: ticker });
      await expect(row).toBeVisible();
      await expect(row.getByText(price)).toBeVisible();
  }

  async filterByDateRange(rangeName: string) {
      const dateRangeSelect = this.page.getByLabel(/período|period|rango/i);
      await dateRangeSelect.click();
      await this.page.getByRole('option', { name: new RegExp(rangeName, 'i') }).click();
      // Wait for loading to finish
      await expect(this.page.getByText(/cargando|loading/i)).not.toBeVisible();
  }

  async exportReport(format: 'csv' | 'pdf' | 'xlsx' = 'csv') {
      const downloadPromise = this.page.waitForEvent('download');
      await this.page.getByRole('button', { name: /exportar|export|descargar/i }).click();
      // If there's a submenu for format
      const formatBtn = this.page.getByRole('menuitem', { name: new RegExp(format, 'i') });
      if (await formatBtn.isVisible()) {
          await formatBtn.click();
      }
      const download = await downloadPromise;
      return download;
  }
}
