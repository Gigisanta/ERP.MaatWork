/**
 * AUM Rows E2E Test
 *
 * AI_DECISION: Test E2E del flujo completo de importación y gestión AUM
 * Justificación: Verifica integración end-to-end de funcionalidad crítica
 * Impacto: Confianza en workflow completo
 */

import { test, expect } from '@playwright/test';

test.describe('AUM Rows Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login como admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@cactus.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL('/admin');

    // Navigate to AUM rows page
    await page.goto('/admin/aum/rows');
    await page.waitForLoadState('networkidle');
  });

  test('should display AUM rows page with table', async ({ page }) => {
    // Verify page title
    await expect(page.locator('h1')).toContainText('Panel de Administración AUM');

    // Verify table is present
    await expect(page.locator('table')).toBeVisible();
  });

  test('should filter rows by broker', async ({ page }) => {
    // Wait for rows to load
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    // Select broker filter
    await page.click('select:has-text("Todos los Brokers")');
    await page.click('option:has-text("Balanz")');

    // Wait for filtered results
    await page.waitForTimeout(500);

    // Verify URL contains filter
    expect(page.url()).toContain('broker=balanz');
  });

  test('should filter rows by status', async ({ page }) => {
    // Select status filter
    await page.click('select:has-text("Todos los Estados")');
    await page.click('option:has-text("Coincidencia")');

    // Wait for filtered results
    await page.waitForTimeout(500);

    // Verify URL contains filter
    expect(page.url()).toContain('status=matched');
  });

  test('should search for rows', async ({ page }) => {
    // Type in search box
    const searchInput = page.locator('input[placeholder*="Buscar"]');
    await searchInput.fill('12345');

    // Wait for debounced search
    await page.waitForTimeout(400);

    // Verify URL contains search term
    expect(page.url()).toContain('search=12345');
  });

  test('should paginate through rows', async ({ page }) => {
    // Wait for pagination controls
    await page.waitForSelector('button:has-text("Siguiente")', { timeout: 5000 });

    // Click next page
    const nextButton = page.locator('button:has-text("Siguiente")');
    if (await nextButton.isEnabled()) {
      await nextButton.click();

      // Verify offset in URL
      await page.waitForTimeout(300);
      expect(page.url()).toContain('offset=');
    }
  });

  test('should toggle "Solo actualizados" checkbox', async ({ page }) => {
    // Find and click checkbox
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.click();

    // Wait for state update
    await page.waitForTimeout(300);

    // Verify checkbox is checked
    await expect(checkbox).toBeChecked();
  });

  test('should upload CSV file', async ({ page }) => {
    // Skip if not admin (canImport check)
    const uploadButton = page.locator('input[type="file"]');
    if ((await uploadButton.count()) === 0) {
      test.skip();
      return;
    }

    // Create a simple CSV file content
    const csvContent = 'Account Number,Holder Name,AUM USD\n12345,Test User,10000';
    const buffer = Buffer.from(csvContent);

    // Upload file
    await uploadButton.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer,
    });

    // Wait for upload to complete
    await page.waitForTimeout(2000);

    // Verify success (could be toast, modal, or page update)
    // This depends on the actual implementation
    await expect(page.locator('body')).toContainText(/subido|éxito|importado/i, { timeout: 10000 });
  });

  test('should navigate to history page', async ({ page }) => {
    // Click history button
    await page.click('button:has-text("Historial de importaciones")');

    // Verify navigation
    await expect(page).toHaveURL('/admin/aum/history');
  });

  test('should handle empty state gracefully', async ({ page }) => {
    // Filter to ensure no results
    await page.fill('input[placeholder*="Buscar"]', 'NONEXISTENT_ACCOUNT_12345678');
    await page.waitForTimeout(400);

    // Verify empty state message
    await expect(page.locator('text=/no se encontraron|sin resultados/i')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should persist filters in URL on page reload', async ({ page }) => {
    // Set filters
    await page.click('select:has-text("Todos los Brokers")');
    await page.click('option:has-text("Balanz")');
    await page.waitForTimeout(300);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify filter persists
    expect(page.url()).toContain('broker=balanz');
  });
});
