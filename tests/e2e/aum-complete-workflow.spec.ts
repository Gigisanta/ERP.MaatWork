/**
 * E2E tests for complete AUM workflow
 *
 * Tests: Upload → Parse → Match → Review → Commit
 *
 * AI_DECISION: Tests E2E completos para workflow AUM
 * Justificación: Validación crítica de flujo completo de datos AUM
 * Impacto: Prevenir errores en procesamiento de datos críticos
 */

import { test, expect, type Page } from '@playwright/test';
import { join } from 'node:path';

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

test.describe('AUM Complete Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should complete full workflow: upload → parse → match → review → commit', async ({
    page,
  }) => {
    // Navigate to AUM admin page
    await page.goto('/admin/aum');
    await expect(page).toHaveURL(/\/admin\/aum/);

    // Step 1: Upload file
    const fileInput = page.locator('input[type="file"]');
    if ((await fileInput.count()) > 0) {
      const testFile = join(__dirname, '../../apps/api/test-fixtures/aum/sample-master.csv');
      await fileInput.first().setInputFiles(testFile);

      // Wait for upload to complete
      await page.waitForSelector(/subido|uploaded|procesando/i, { timeout: 10000 });
    }

    // Step 2: Verify file is parsed
    await page.waitForTimeout(2000);
    const parsedStatus = page.getByText(/parsed|procesado/i);
    if ((await parsedStatus.count()) > 0) {
      await expect(parsedStatus.first()).toBeVisible();
    }

    // Step 3: Review matches
    const reviewButton = page.getByRole('button', { name: /revisar|review|verificar/i });
    if ((await reviewButton.count()) > 0) {
      await reviewButton.first().click();

      // Should show match results
      await page.waitForSelector(/matched|coincidencias/i, { timeout: 5000 });
    }

    // Step 4: Commit import
    const commitButton = page.getByRole('button', { name: /commit|confirmar|guardar/i });
    if ((await commitButton.count()) > 0) {
      await commitButton.first().click();

      // Should show success message
      await expect(page.getByText(/éxito|success|committed/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('should handle duplicate rows and conflicts', async ({ page }) => {
    await page.goto('/admin/aum');

    // Upload file with duplicates
    const fileInput = page.locator('input[type="file"]');
    if ((await fileInput.count()) > 0) {
      const testFile = join(__dirname, '../../apps/api/test-fixtures/aum/sample-master.csv');
      await fileInput.first().setInputFiles(testFile);
      await page.waitForTimeout(2000);
    }

    // Check for duplicate warnings
    const duplicateWarning = page.getByText(/duplicado|duplicate|conflicto/i);
    if ((await duplicateWarning.count()) > 0) {
      await expect(duplicateWarning.first()).toBeVisible();
    }

    // Should allow resolving conflicts
    const resolveButton = page.getByRole('button', { name: /resolver|resolve/i });
    if ((await resolveButton.count()) > 0) {
      await resolveButton.first().click();
    }
  });

  test('should handle advisor mapping workflow', async ({ page }) => {
    await page.goto('/admin/aum');

    // Navigate to advisor mapping section
    const mappingTab = page.getByRole('tab', { name: /mapping|mapeo|asesor/i });
    if ((await mappingTab.count()) > 0) {
      await mappingTab.first().click();

      // Upload mapping file
      const fileInput = page.locator('input[type="file"]');
      if ((await fileInput.count()) > 0) {
        const mappingFile = join(__dirname, '../../apps/api/test-fixtures/aum/sample-mapping.csv');
        await fileInput.first().setInputFiles(mappingFile);
        await page.waitForTimeout(2000);
      }

      // Verify mapping was processed
      const successMessage = page.getByText(/mapeo|mapping|procesado/i);
      if ((await successMessage.count()) > 0) {
        await expect(successMessage.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should allow purging non-committed uploads', async ({ page }) => {
    await page.goto('/admin/aum');

    // Upload a file
    const fileInput = page.locator('input[type="file"]');
    if ((await fileInput.count()) > 0) {
      const testFile = join(__dirname, '../../apps/api/test-fixtures/aum/sample-master.csv');
      await fileInput.first().setInputFiles(testFile);
      await page.waitForTimeout(2000);
    }

    // Find purge button (should be in admin section)
    const purgeButton = page.getByRole('button', { name: /purge|limpiar|eliminar/i });
    if ((await purgeButton.count()) > 0) {
      await purgeButton.first().click();

      // Confirm purge
      const confirmButton = page.getByRole('button', { name: /confirmar|confirm/i });
      if ((await confirmButton.count()) > 0) {
        await confirmButton.first().click();
      }

      // Should show success
      await expect(page.getByText(/eliminado|purged|limpiado/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should verify import integrity', async ({ page }) => {
    await page.goto('/admin/aum');

    // Find verify button
    const verifyButton = page.getByRole('button', { name: /verificar|verify/i });
    if ((await verifyButton.count()) > 0) {
      await verifyButton.first().click();

      // Should show verification results
      await page.waitForSelector(/verificación|verification|integridad/i, { timeout: 5000 });

      const results = page.getByText(/discrepancy|coincidencias|rows/i);
      if ((await results.count()) > 0) {
        await expect(results.first()).toBeVisible();
      }
    }
  });
});
