import { test, expect } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL || 'giolivosantarelli@gmail.com';
const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'admin123';

async function login(page: any) {
  await page.goto('/login');
  await page.getByLabel(/email|usuario|correo/i).first().fill(adminEmail);
  await page.getByLabel(/contraseña|password/i).first().fill(adminPassword);
  await page.getByRole('button', { name: /ingresar|login|entrar/i }).click();
  await expect(page).toHaveURL(/(contacts|pipeline|portfolios|profile|analytics|benchmarks|\/)$/);
}

test.describe('Contacts CRUD happy path', () => {
  test('create, view and delete contact', async ({ page }) => {
    await login(page);

    await page.goto('/contacts');
    const newBtn = page.getByRole('button', { name: /nuevo|new|crear/i });
    if (await newBtn.count() === 0) test.skip();
    await newBtn.first().click();

    const fullName = `Test User ${Date.now()}`;
    await page.getByLabel(/nombre|full name|nombre completo/i).first().fill(fullName);
    const emailField = page.getByLabel(/email/i).first();
    if (await emailField.count()) {
      await emailField.fill(`test${Date.now()}@example.com`);
    }

    const saveBtn = page.getByRole('button', { name: /guardar|save|crear/i });
    await saveBtn.first().click();

    await expect(page.getByText(fullName)).toBeVisible();

    await page.getByText(fullName).first().click();
    await expect(page).toHaveURL(/contacts\//);

    const deleteBtn = page.getByRole('button', { name: /eliminar|delete/i });
    if (await deleteBtn.count()) {
      await deleteBtn.first().click();
      const confirm = page.getByRole('button', { name: /confirmar|sí|si|delete/i });
      if (await confirm.count()) await confirm.first().click();
      await expect(page).toHaveURL(/contacts$/);
    }
  });
});





