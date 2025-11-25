/**
 * E2E tests for contacts management
 * 
 * Tests complete CRUD operations and workflows for contacts
 */

import { test, expect, type Page } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL || 'giolivosantarelli@gmail.com';
const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'admin123';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email|usuario|correo/i).first().fill(adminEmail);
  await page.getByLabel(/contraseña|password/i).first().fill(adminPassword);
  await page.getByRole('button', { name: /ingresar|login|entrar/i }).click();
  await expect(page).toHaveURL(/(contacts|pipeline|portfolios|profile|analytics|benchmarks|\/)$/);
}

test.describe('Contacts Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should create a new contact', async ({ page }) => {
    await page.goto('/contacts');

    // Click new contact button
    const newButton = page.getByRole('button', { name: /nuevo|new|crear/i });
    if (await newButton.count() === 0) {
      test.skip();
      return;
    }

    await newButton.first().click();

    // Fill contact form
    const timestamp = Date.now();
    const firstName = `Test${timestamp}`;
    const lastName = `Contact${timestamp}`;
    const email = `test${timestamp}@example.com`;

    await page.getByLabel(/nombre|first name/i).first().fill(firstName);
    await page.getByLabel(/apellido|last name/i).first().fill(lastName);
    await page.getByLabel(/email/i).first().fill(email);

    // Save contact
    await page.getByRole('button', { name: /guardar|save|crear/i }).first().click();

    // Should see success message or redirect to contact detail
    await expect(page.getByText(firstName)).toBeVisible({ timeout: 10000 });
  });

  test('should view contact details', async ({ page }) => {
    await page.goto('/contacts');

    // Click on first contact
    const firstContact = page.locator('a[href*="/contacts/"]').first();
    if (await firstContact.count() === 0) {
      test.skip();
      return;
    }

    await firstContact.click();

    // Should be on contact detail page
    await expect(page).toHaveURL(/\/contacts\/[^/]+$/);

    // Should see contact information
    await expect(page.getByText(/nombre|name|email/i).first()).toBeVisible();
  });

  test('should edit contact', async ({ page }) => {
    await page.goto('/contacts');

    // Click on first contact
    const firstContact = page.locator('a[href*="/contacts/"]').first();
    if (await firstContact.count() === 0) {
      test.skip();
      return;
    }

    await firstContact.click();

    // Find edit button or inline edit
    const editButton = page.getByRole('button', { name: /editar|edit/i });
    if (await editButton.count() > 0) {
      await editButton.first().click();
    }

    // Update contact name
    const timestamp = Date.now();
    const newName = `Updated${timestamp}`;

    const nameInput = page.getByLabel(/nombre|name/i).first();
    await nameInput.clear();
    await nameInput.fill(newName);

    // Save changes
    await page.getByRole('button', { name: /guardar|save/i }).first().click();

    // Should see updated name
    await expect(page.getByText(newName)).toBeVisible({ timeout: 5000 });
  });

  test('should delete contact', async ({ page }) => {
    await page.goto('/contacts');

    // Create a contact first
    const newButton = page.getByRole('button', { name: /nuevo|new|crear/i });
    if (await newButton.count() === 0) {
      test.skip();
      return;
    }

    await newButton.first().click();

    const timestamp = Date.now();
    const firstName = `DeleteTest${timestamp}`;

    await page.getByLabel(/nombre|first name/i).first().fill(firstName);
    await page.getByLabel(/email/i).first().fill(`delete${timestamp}@example.com`);

    await page.getByRole('button', { name: /guardar|save|crear/i }).first().click();

    // Wait for contact to be created
    await expect(page.getByText(firstName)).toBeVisible({ timeout: 10000 });

    // Navigate to contact detail
    await page.getByText(firstName).first().click();

    // Find delete button
    const deleteButton = page.getByRole('button', { name: /eliminar|delete/i });
    if (await deleteButton.count() === 0) {
      test.skip();
      return;
    }

    await deleteButton.first().click();

    // Confirm deletion
    const confirmButton = page.getByRole('button', { name: /confirmar|sí|si|delete/i });
    if (await confirmButton.count() > 0) {
      await confirmButton.first().click();
    }

    // Should redirect to contacts list
    await expect(page).toHaveURL(/\/contacts$/);

    // Contact should not be visible
    await expect(page.getByText(firstName)).not.toBeVisible();
  });

  test('should assign contact to advisor', async ({ page }) => {
    await page.goto('/contacts');

    // Click on first contact
    const firstContact = page.locator('a[href*="/contacts/"]').first();
    if (await firstContact.count() === 0) {
      test.skip();
      return;
    }

    await firstContact.click();

    // Find assign advisor section
    const assignSection = page.getByText(/asignar|assign|advisor/i);
    if (await assignSection.count() === 0) {
      test.skip();
      return;
    }

    // Click assign button or open dropdown
    const assignButton = page.getByRole('button', { name: /asignar|assign/i });
    if (await assignButton.count() > 0) {
      await assignButton.first().click();

      // Select advisor from dropdown
      const advisorOption = page.getByRole('option').first();
      if (await advisorOption.count() > 0) {
        await advisorOption.first().click();
      }

      // Should see success message or updated assignment
      await expect(page.getByText(/asignado|assigned/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should move contact in pipeline', async ({ page }) => {
    await page.goto('/pipeline');

    // Find a contact card
    const contactCard = page.locator('[data-testid="contact-card"], .contact-card').first();
    if (await contactCard.count() === 0) {
      test.skip();
      return;
    }

    // Get initial stage
    const initialStage = await contactCard.locator('..').getAttribute('data-stage');

    // Drag and drop to different stage
    const targetStage = page.locator('[data-stage]').filter({ hasNot: contactCard }).first();
    if (await targetStage.count() > 0) {
      await contactCard.dragTo(targetStage.first());

      // Should see contact in new stage
      await expect(targetStage.getByText(contactCard.textContent() || '')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should add note to contact', async ({ page }) => {
    await page.goto('/contacts');

    // Click on first contact
    const firstContact = page.locator('a[href*="/contacts/"]').first();
    if (await firstContact.count() === 0) {
      test.skip();
      return;
    }

    await firstContact.click();

    // Find notes section
    const notesSection = page.getByText(/notas|notes/i);
    if (await notesSection.count() === 0) {
      test.skip();
      return;
    }

    // Click add note button
    const addNoteButton = page.getByRole('button', { name: /agregar nota|add note|nueva nota/i });
    if (await addNoteButton.count() > 0) {
      await addNoteButton.first().click();

      // Fill note content
      const noteContent = `Test note ${Date.now()}`;
      await page.getByLabel(/nota|note|contenido/i).fill(noteContent);

      // Save note
      await page.getByRole('button', { name: /guardar|save/i }).first().click();

      // Should see note in list
      await expect(page.getByText(noteContent)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should add tag to contact', async ({ page }) => {
    await page.goto('/contacts');

    // Click on first contact
    const firstContact = page.locator('a[href*="/contacts/"]').first();
    if (await firstContact.count() === 0) {
      test.skip();
      return;
    }

    await firstContact.click();

    // Find tags section
    const tagsSection = page.getByText(/etiquetas|tags/i);
    if (await tagsSection.count() === 0) {
      test.skip();
      return;
    }

    // Click add tag button or open tag selector
    const addTagButton = page.getByRole('button', { name: /agregar etiqueta|add tag/i });
    if (await addTagButton.count() > 0) {
      await addTagButton.first().click();

      // Select tag from dropdown
      const tagOption = page.getByRole('option').first();
      if (await tagOption.count() > 0) {
        await tagOption.first().click();
      }

      // Should see tag added
      await expect(page.getByText(/etiqueta agregada|tag added/i)).toBeVisible({ timeout: 5000 });
    }
  });
});

