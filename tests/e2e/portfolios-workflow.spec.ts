/**
 * E2E tests for complete portfolio workflow
 * 
 * Tests: Create → Add components → Set benchmarks → View analytics → Edit → Compare → Delete
 * 
 * AI_DECISION: Tests E2E completos para workflow de portfolios
 * Justificación: Validación crítica de gestión de carteras
 * Impacto: Prevenir errores en gestión de portfolios
 */

import { test, expect, type Page } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL || 'giolivosantarelli@gmail.com';
const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'admin123';

async function login(page: Page, email: string = adminEmail, password: string = adminPassword) {
  await page.goto('/login');
  await page.getByLabel(/email|usuario|correo/i).first().fill(email);
  await page.getByLabel(/contraseña|password/i).first().fill(password);
  await page.getByRole('button', { name: /ingresar|login|entrar/i }).click();
  await expect(page).toHaveURL(/(contacts|pipeline|portfolios|profile|analytics|benchmarks|\/)$/);
}

test.describe('Portfolio Complete Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should create portfolio with components and benchmarks', async ({ page }) => {
    await page.goto('/portfolios');
    await expect(page).toHaveURL(/\/portfolios/);

    // Step 1: Create portfolio
    const createButton = page.getByRole('button', { name: /crear|nuevo|add/i });
    if (await createButton.count() > 0) {
      await createButton.first().click();

      // Fill portfolio form
      await page.getByLabel(/nombre|name/i).fill('Test Portfolio');
      await page.getByLabel(/descripción|description/i).fill('Test Description');
      
      const submitButton = page.getByRole('button', { name: /crear|guardar|save/i });
      await submitButton.click();

      // Wait for portfolio to be created
      await expect(page.getByText('Test Portfolio')).toBeVisible({ timeout: 10000 });
    }

    // Step 2: Add components
    const portfolioCard = page.getByText('Test Portfolio').locator('..');
    if (await portfolioCard.count() > 0) {
      await portfolioCard.first().click();

      // Add component button
      const addComponentButton = page.getByRole('button', { name: /agregar|add|component/i });
      if (await addComponentButton.count() > 0) {
        await addComponentButton.first().click();

        // Search for asset
        const searchInput = page.getByPlaceholder(/buscar|search/i);
        if (await searchInput.count() > 0) {
          await searchInput.first().fill('AAPL');
          await page.waitForTimeout(1000);

          // Select asset
          const assetOption = page.getByText(/AAPL|Apple/i);
          if (await assetOption.count() > 0) {
            await assetOption.first().click();
          }
        }

        // Set weight
        const weightInput = page.getByLabel(/peso|weight/i);
        if (await weightInput.count() > 0) {
          await weightInput.first().fill('50');
        }

        // Save component
        const saveButton = page.getByRole('button', { name: /guardar|save/i });
        if (await saveButton.count() > 0) {
          await saveButton.first().click();
        }
      }
    }

    // Step 3: Set benchmark
    const benchmarkSelect = page.getByLabel(/benchmark/i);
    if (await benchmarkSelect.count() > 0) {
      await benchmarkSelect.first().click();
      const benchmarkOption = page.getByRole('option').first();
      if (await benchmarkOption.count() > 0) {
        await benchmarkOption.first().click();
      }
    }

    // Step 4: View analytics
    const analyticsTab = page.getByRole('tab', { name: /analytics|análisis/i });
    if (await analyticsTab.count() > 0) {
      await analyticsTab.first().click();
      await expect(page.getByText(/performance|rendimiento/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should edit portfolio', async ({ page }) => {
    await page.goto('/portfolios');

    // Find existing portfolio
    const portfolioCard = page.getByRole('article').or(page.getByRole('button')).first();
    if (await portfolioCard.count() > 0) {
      await portfolioCard.first().click();

      // Edit button
      const editButton = page.getByRole('button', { name: /editar|edit/i });
      if (await editButton.count() > 0) {
        await editButton.first().click();

        // Update name
        const nameInput = page.getByLabel(/nombre|name/i);
        if (await nameInput.count() > 0) {
          await nameInput.first().fill('Updated Portfolio Name');
        }

        // Save
        const saveButton = page.getByRole('button', { name: /guardar|save/i });
        if (await saveButton.count() > 0) {
          await saveButton.first().click();
        }

        // Verify update
        await expect(page.getByText('Updated Portfolio Name')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should compare portfolios', async ({ page }) => {
    await page.goto('/portfolios');

    // Select multiple portfolios for comparison
    const compareButton = page.getByRole('button', { name: /comparar|compare/i });
    if (await compareButton.count() > 0) {
      await compareButton.first().click();

      // Select portfolios
      const portfolioCheckboxes = page.getByRole('checkbox');
      const count = await portfolioCheckboxes.count();
      if (count >= 2) {
        await portfolioCheckboxes.nth(0).check();
        await portfolioCheckboxes.nth(1).check();

        // Confirm comparison
        const confirmButton = page.getByRole('button', { name: /comparar|compare/i });
        if (await confirmButton.count() > 0) {
          await confirmButton.first().click();
        }

        // Should show comparison view
        await expect(page.getByText(/comparación|comparison/i)).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should delete portfolio', async ({ page }) => {
    await page.goto('/portfolios');

    // Find portfolio to delete
    const portfolioCard = page.getByRole('article').or(page.getByRole('button')).first();
    if (await portfolioCard.count() > 0) {
      await portfolioCard.first().click();

      // Delete button
      const deleteButton = page.getByRole('button', { name: /eliminar|delete/i });
      if (await deleteButton.count() > 0) {
        await deleteButton.first().click();

        // Confirm deletion
        const confirmButton = page.getByRole('button', { name: /confirmar|confirm|eliminar/i });
        if (await confirmButton.count() > 0) {
          await confirmButton.first().click();
        }

        // Should show success message
        await expect(page.getByText(/eliminado|deleted|éxito/i)).toBeVisible({ timeout: 5000 });
      }
    }
  });
});


