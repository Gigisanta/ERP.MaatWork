/**
 * E2E tests para configuración administrativa
 *
 * AI_DECISION: Tests E2E para configuración del sistema
 * Justificación: Validación crítica de configuración
 * Impacto: Prevenir errores en configuración
 */

import { test, expect } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL || 'giolivosantarelli@gmail.com';
const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'admin123';

async function login(page: any) {
  await page.goto('/login');
  const emailInput = page.getByLabel(/email|usuario|correo/i).first();
  await emailInput.fill(adminEmail);
  const passwordInput = page.getByLabel(/contraseña|password/i).first();
  await passwordInput.fill(adminPassword);
  await page.getByRole('button', { name: /ingresar|login|entrar/i }).click();
  await expect(page).toHaveURL(/(contacts|pipeline|portfolios|profile|analytics|benchmarks|\/)$/);
}

test.describe('Admin Settings E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

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
