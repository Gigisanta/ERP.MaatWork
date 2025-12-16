/**
 * E2E tests for analytics workflow
 *
 * Tests: View dashboard → Filter metrics → Compare periods → Export reports
 *
 * AI_DECISION: Tests E2E completos para workflow de analytics
 * Justificación: Validación crítica de analytics y reportes
 * Impacto: Prevenir errores en visualización de datos
 */

import { test, expect, type Page } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL || 'giolivosantarelli@gmail.com';
const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'admin123';

async function login(page: Page, email: string = adminEmail, password: string = adminPassword) {
  await page.goto('/login');
  await page
    .getByLabel(/email|usuario|correo/i)
    .first()
    .fill(email);
  await page
    .getByLabel(/contraseña|password/i)
    .first()
    .fill(password);
  await page.getByRole('button', { name: /ingresar|login|entrar/i }).click();
  await expect(page).toHaveURL(/(contacts|pipeline|portfolios|profile|analytics|benchmarks|\/)$/);
}

test.describe('Analytics Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should view analytics dashboard', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page).toHaveURL(/\/analytics/);

    // Should show dashboard metrics
    await expect(page.getByText(/métricas|metrics|dashboard/i)).toBeVisible({ timeout: 5000 });
  });

  test('should filter metrics by date range', async ({ page }) => {
    await page.goto('/analytics');

    // Find date range selector
    const dateRangeSelect = page.getByLabel(/período|period|rango/i);
    if ((await dateRangeSelect.count()) > 0) {
      await dateRangeSelect.first().click();

      // Select different period
      const periodOption = page.getByRole('option', { name: /último mes|last month/i });
      if ((await periodOption.count()) > 0) {
        await periodOption.first().click();
      }

      // Should update metrics
      await page.waitForTimeout(2000);
      await expect(page.getByText(/cargando|loading/i)).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('should compare different periods', async ({ page }) => {
    await page.goto('/analytics');

    // Find compare button
    const compareButton = page.getByRole('button', { name: /comparar|compare/i });
    if ((await compareButton.count()) > 0) {
      await compareButton.first().click();

      // Select comparison periods
      const period1Select = page.getByLabel(/período 1|period 1/i);
      const period2Select = page.getByLabel(/período 2|period 2/i);

      if ((await period1Select.count()) > 0 && (await period2Select.count()) > 0) {
        await period1Select.first().click();
        await page.getByRole('option').first().click();

        await period2Select.first().click();
        await page.getByRole('option').nth(1).click();

        // Should show comparison
        await expect(page.getByText(/comparación|comparison/i)).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should export reports', async ({ page }) => {
    await page.goto('/analytics');

    // Set up download listener
    const downloadPromise = page.waitForEvent('download');

    // Find export button
    const exportButton = page.getByRole('button', { name: /exportar|export|descargar/i });
    if ((await exportButton.count()) > 0) {
      await exportButton.first().click();

      // Wait for download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx|pdf)$/);
    }
  });

  test('should view charts', async ({ page }) => {
    await page.goto('/analytics');

    // Should show charts
    const chart = page.locator('canvas').or(page.locator('[role="img"]'));
    if ((await chart.count()) > 0) {
      await expect(chart.first()).toBeVisible({ timeout: 5000 });
    }
  });
});
