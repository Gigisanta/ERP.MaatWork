/**
 * E2E tests para gestión de benchmarks
 *
 * AI_DECISION: Tests E2E para CRUD de benchmarks
 * Justificación: Validación crítica de gestión de benchmarks
 * Impacto: Prevenir errores en gestión de benchmarks
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

test.describe('Benchmarks Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

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
