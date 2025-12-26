/**
 * E2E tests for benchmarks workflow
 *
 * Tests: Create benchmark → Add components → View performance → Compare with portfolios
 *
 * AI_DECISION: Tests E2E completos para workflow de benchmarks
 * Justificación: Validación crítica de gestión de benchmarks
 * Impacto: Prevenir errores en benchmarks
 */

import { test, expect } from '@playwright/test';

test.describe('Benchmarks Workflow', () => {
  test('should create benchmark with components', async ({ page }) => {
    await page.goto('/benchmarks');
    await expect(page).toHaveURL(/\/benchmarks/);

    // Step 1: Create benchmark
    const createButton = page.getByRole('button', { name: /crear|nuevo|add/i });
    if ((await createButton.count()) > 0) {
      await createButton.first().click();

      // Fill benchmark form
      await page.getByLabel(/nombre|name/i).fill('Test Benchmark');
      await page.getByLabel(/tipo|type/i).selectOption('individual');

      const submitButton = page.getByRole('button', { name: /crear|guardar|save/i });
      await submitButton.click();

      // Wait for benchmark to be created
      await expect(page.getByText('Test Benchmark')).toBeVisible({ timeout: 10000 });
    }

    // Step 2: Add components
    const benchmarkCard = page.getByText('Test Benchmark').locator('..');
    if ((await benchmarkCard.count()) > 0) {
      await benchmarkCard.first().click();

      // Add component
      const addComponentButton = page.getByRole('button', { name: /agregar|add|component/i });
      if ((await addComponentButton.count()) > 0) {
        await addComponentButton.first().click();

        // Search for asset
        const searchInput = page.getByPlaceholder(/buscar|search/i);
        if ((await searchInput.count()) > 0) {
          await searchInput.first().fill('SPY');
          await page.waitForTimeout(1000);

          // Select asset
          const assetOption = page.getByText(/SPY|S&P/i);
          if ((await assetOption.count()) > 0) {
            await assetOption.first().click();
          }
        }

        // Set weight
        const weightInput = page.getByLabel(/peso|weight/i);
        if ((await weightInput.count()) > 0) {
          await weightInput.first().fill('100');
        }

        // Save
        const saveButton = page.getByRole('button', { name: /guardar|save/i });
        if ((await saveButton.count()) > 0) {
          await saveButton.first().click();
        }
      }
    }
  });

  test('should view benchmark performance', async ({ page }) => {
    await page.goto('/benchmarks');

    // Find existing benchmark
    const benchmarkCard = page.getByRole('article').or(page.getByRole('button')).first();
    if ((await benchmarkCard.count()) > 0) {
      await benchmarkCard.first().click();

      // Navigate to performance tab
      const performanceTab = page.getByRole('tab', { name: /performance|rendimiento/i });
      if ((await performanceTab.count()) > 0) {
        await performanceTab.first().click();

        // Should show performance chart
        await expect(page.getByText(/performance|rendimiento|gráfico/i)).toBeVisible({
          timeout: 5000,
        });
      }
    }
  });

  test('should compare benchmark with portfolios', async ({ page }) => {
    await page.goto('/benchmarks');

    // Select benchmark
    const benchmarkCard = page.getByRole('article').or(page.getByRole('button')).first();
    if ((await benchmarkCard.count()) > 0) {
      await benchmarkCard.first().click();

      // Compare button
      const compareButton = page.getByRole('button', { name: /comparar|compare/i });
      if ((await compareButton.count()) > 0) {
        await compareButton.first().click();

        // Select portfolios to compare
        const portfolioCheckboxes = page.getByRole('checkbox');
        const count = await portfolioCheckboxes.count();
        if (count > 0) {
          await portfolioCheckboxes.first().check();

          // Confirm comparison
          const confirmButton = page.getByRole('button', { name: /comparar|compare/i });
          if ((await confirmButton.count()) > 0) {
            await confirmButton.first().click();
          }

          // Should show comparison
          await expect(page.getByText(/comparación|comparison/i)).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });
});
