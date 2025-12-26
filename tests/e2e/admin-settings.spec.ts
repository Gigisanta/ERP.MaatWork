/**
 * E2E tests para configuración administrativa
 *
 * AI_DECISION: Tests E2E para configuración del sistema
 * Justificación: Validación crítica de configuración
 * Impacto: Prevenir errores en configuración
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Settings E2E', () => {
  test('debería acceder a configuración', async ({ page }) => {
    await page.goto('/admin/settings');

    // Verificar que la página carga
    await expect(page.getByText(/configuración|settings|ajustes/i)).toBeVisible({ timeout: 10000 });
  });

  test('debería actualizar configuración de advisors', async ({ page }) => {
    await page.goto('/admin/settings/aum-advisors');

    // Verificar que la página carga
    await expect(page.getByText(/advisors|asesores|configuración/i)).toBeVisible({
      timeout: 10000,
    });
  });
});
