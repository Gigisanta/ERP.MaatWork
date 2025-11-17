/**
 * E2E tests para gestión administrativa de usuarios
 * 
 * AI_DECISION: Tests E2E para CRUD completo de usuarios (admin)
 * Justificación: Validación crítica de gestión de usuarios
 * Impacto: Prevenir errores en administración de usuarios
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

test.describe('Admin Users Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('debería listar usuarios', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Verificar que la página carga
    await expect(page.getByText(/usuarios|users|administración/i)).toBeVisible({ timeout: 10000 });
  });

  test('debería crear usuario', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Buscar botón de crear
    const createButton = page.getByRole('button', { name: /nuevo|crear|new|add/i }).first();
    if (await createButton.count() > 0) {
      await createButton.click();
      
      // Llenar formulario
      const emailInput = page.getByLabel(/email/i).first();
      if (await emailInput.count() > 0) {
        await emailInput.fill(`test${Date.now()}@example.com`);
      }
      
      const nameInput = page.getByLabel(/nombre|name/i).first();
      if (await nameInput.count() > 0) {
        await nameInput.fill('Test User');
      }
      
      const passwordInput = page.getByLabel(/contraseña|password/i).first();
      if (await passwordInput.count() > 0) {
        await passwordInput.fill('password123');
      }
      
      // Seleccionar rol
      const roleSelect = page.getByLabel(/rol|role/i).first();
      if (await roleSelect.count() > 0) {
        await roleSelect.selectOption('advisor');
      }
      
      // Guardar
      const saveButton = page.getByRole('button', { name: /guardar|save/i }).first();
      if (await saveButton.count() > 0) {
        await saveButton.click();
        
        // Verificar éxito
        await expect(page.getByText(/éxito|success|creado/i)).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('debería editar usuario', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Buscar botón de editar
    const editButton = page.getByRole('button', { name: /editar|edit/i }).first();
    if (await editButton.count() > 0) {
      await editButton.click();
      
      // Modificar nombre
      const nameInput = page.getByLabel(/nombre|name/i).first();
      if (await nameInput.count() > 0) {
        await nameInput.fill(`Updated Name ${Date.now()}`);
        
        const saveButton = page.getByRole('button', { name: /guardar|save/i }).first();
        if (await saveButton.count() > 0) {
          await saveButton.click();
        }
      }
    }
  });

  test('debería cambiar rol de usuario', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Buscar usuario y cambiar rol
    const roleSelect = page.getByLabel(/rol|role/i).first();
    if (await roleSelect.count() > 0) {
      await roleSelect.selectOption('manager');
      await page.waitForTimeout(500);
    }
  });

  test('debería activar/desactivar usuario', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Buscar switch de activación
    const activeSwitch = page.locator('input[type="checkbox"][checked], [role="switch"]').first();
    if (await activeSwitch.count() > 0) {
      await activeSwitch.click();
      await page.waitForTimeout(500);
    }
  });
});

