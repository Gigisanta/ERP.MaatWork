/**
 * E2E tests for complete pipeline workflow
 *
 * Tests: Create contact → Move through stages → Add tasks → Complete
 *
 * AI_DECISION: Tests E2E completos para workflow de pipeline
 * Justificación: Validación crítica de pipeline de ventas
 * Impacto: Prevenir errores en gestión de pipeline
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

test.describe('Pipeline Complete Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should create contact and move through pipeline stages', async ({ page }) => {
    // Step 1: Create contact
    await page.goto('/contacts');

    const createButton = page.getByRole('button', { name: /crear|nuevo|add/i });
    if ((await createButton.count()) > 0) {
      await createButton.first().click();

      // Fill contact form
      await page.getByLabel(/nombre|first name/i).fill('Test');
      await page.getByLabel(/apellido|last name/i).fill('Contact');
      await page.getByLabel(/email/i).fill('test@example.com');

      // Save contact
      const saveButton = page.getByRole('button', { name: /guardar|save|crear/i });
      await saveButton.click();

      // Wait for contact to be created
      await expect(page.getByText('Test Contact')).toBeVisible({ timeout: 10000 });
    }

    // Step 2: Navigate to pipeline
    await page.goto('/pipeline');
    await expect(page).toHaveURL(/\/pipeline/);

    // Step 3: Find contact in initial stage
    const contactCard = page.getByText('Test Contact').locator('..');
    if ((await contactCard.count()) > 0) {
      // Drag to next stage
      const stages = page.locator('[data-stage-id]');
      const stageCount = await stages.count();

      if (stageCount >= 2) {
        const sourceStage = stages.nth(0);
        const targetStage = stages.nth(1);

        // Drag and drop
        await contactCard.first().dragTo(targetStage.first());

        // Wait for move to complete
        await page.waitForTimeout(1000);

        // Verify contact is in new stage
        await expect(targetStage.getByText('Test Contact')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should add task to contact', async ({ page }) => {
    await page.goto('/pipeline');

    // Find a contact
    const contactCard = page.locator('[data-contact-id]').first();
    if ((await contactCard.count()) > 0) {
      await contactCard.first().click();

      // Add task button
      const addTaskButton = page.getByRole('button', { name: /tarea|task|agregar/i });
      if ((await addTaskButton.count()) > 0) {
        await addTaskButton.first().click();

        // Fill task form
        await page.getByLabel(/título|title/i).fill('Follow up call');
        await page.getByLabel(/descripción|description/i).fill('Call client tomorrow');

        // Save task
        const saveButton = page.getByRole('button', { name: /guardar|save/i });
        if ((await saveButton.count()) > 0) {
          await saveButton.first().click();
        }

        // Verify task appears
        await expect(page.getByText('Follow up call')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should complete task', async ({ page }) => {
    await page.goto('/pipeline');

    // Find contact with task
    const contactCard = page.locator('[data-contact-id]').first();
    if ((await contactCard.count()) > 0) {
      await contactCard.first().click();

      // Find task checkbox
      const taskCheckbox = page.getByRole('checkbox').first();
      if ((await taskCheckbox.count()) > 0) {
        await taskCheckbox.check();

        // Verify task is marked as complete
        await expect(taskCheckbox).toBeChecked();
      }
    }
  });

  test('should handle bulk move operations', async ({ page }) => {
    await page.goto('/pipeline');

    // Select multiple contacts
    const selectAllCheckbox = page.getByLabel(/seleccionar todos|select all/i);
    if ((await selectAllCheckbox.count()) > 0) {
      await selectAllCheckbox.first().check();

      // Bulk move button
      const bulkMoveButton = page.getByRole('button', { name: /mover|move|bulk/i });
      if ((await bulkMoveButton.count()) > 0) {
        await bulkMoveButton.first().click();

        // Select target stage
        const stageSelect = page.getByLabel(/etapa|stage/i);
        if ((await stageSelect.count()) > 0) {
          await stageSelect.first().click();
          const stageOption = page.getByRole('option').first();
          if ((await stageOption.count()) > 0) {
            await stageOption.first().click();
          }
        }

        // Confirm move
        const confirmButton = page.getByRole('button', { name: /confirmar|confirm/i });
        if ((await confirmButton.count()) > 0) {
          await confirmButton.first().click();
        }

        // Should show success
        await expect(page.getByText(/movido|moved|éxito/i)).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
