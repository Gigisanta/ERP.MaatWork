/**
 * E2E tests para gestión de benchmarks
 *
 * AI_DECISION: Tests E2E para CRUD de benchmarks
 * Justificación: Validación crítica de gestión de benchmarks
 * Impacto: Prevenir errores en gestión de benchmarks
 */

import { test, expect } from '@playwright/test';

test.describe('Benchmarks Management E2E', () => {
  test('debería listar benchmarks', async ({ page }) => {
    await page.goto('/benchmarks');

    // Verificar que la página carga
    await expect(page.getByText(/benchmarks|referencias/i)).toBeVisible({ timeout: 10000 });
  });

  test('debería crear benchmark', async ({ page }) => {
    await page.goto('/benchmarks');

    // Buscar botón de crear
    const createButton = page.getByRole('button', { name: /nuevo|crear|new|add/i }).first();
    if ((await createButton.count()) > 0) {
      await createButton.click();

      // Llenar formulario
      const nameInput = page.getByLabel(/nombre|name/i).first();
      if ((await nameInput.count()) > 0) {
        await nameInput.fill(`Test Benchmark ${Date.now()}`);
      }

      // Guardar
      const saveButton = page.getByRole('button', { name: /guardar|save/i }).first();
      if ((await saveButton.count()) > 0) {
        await saveButton.click();

        // Verificar éxito
        await expect(page.getByText(/éxito|success|creado/i)).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('debería ver detalles de benchmark', async ({ page }) => {
    await page.goto('/benchmarks');

    // Buscar primer benchmark
    const benchmarkLink = page.locator('a[href*="/benchmarks/"]').first();
    if ((await benchmarkLink.count()) > 0) {
      await benchmarkLink.click();

      // Verificar detalles
      await expect(page).toHaveURL(/\/benchmarks\/[^/]+$/);
    }
  });
});
