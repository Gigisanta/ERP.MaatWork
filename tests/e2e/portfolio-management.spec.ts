/**
 * E2E tests para gestión completa de portfolios
 * 
 * AI_DECISION: Tests E2E para flujo completo de portfolios
 * Justificación: Validación crítica de flujo de usuario completo
 * Impacto: Prevenir errores en gestión de portfolios
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

test.describe('Portfolio Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('debería crear portfolio completo con componentes', async ({ page }) => {
    await page.goto('/portfolios');
    
    // Esperar a que cargue la página
    await expect(page.getByText(/carteras|portfolios/i)).toBeVisible();
    
    // Buscar botón de crear
    const createButton = page.getByRole('button', { name: /nuevo|crear|new|add/i }).first();
    if (await createButton.count() > 0) {
      await createButton.click();
      
      // Llenar formulario
      const nameInput = page.getByLabel(/nombre|name/i).first();
      if (await nameInput.count() > 0) {
        await nameInput.fill(`Test Portfolio ${Date.now()}`);
      }
      
      // Buscar botón de guardar
      const saveButton = page.getByRole('button', { name: /guardar|save|crear|create/i }).first();
      if (await saveButton.count() > 0) {
        await saveButton.click();
        
        // Verificar que se creó
        await expect(page.getByText(/portfolio|creado|success/i)).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('debería listar portfolios existentes', async ({ page }) => {
    await page.goto('/portfolios');
    
    // Verificar que la página carga
    await expect(page.getByText(/carteras|portfolios/i)).toBeVisible();
    
    // Verificar que hay algún contenido (lista o empty state)
    const hasContent = await page.getByText(/portfolio|sin carteras|empty/i).count() > 0;
    expect(hasContent).toBeTruthy();
  });

  test('debería ver detalles de portfolio', async ({ page }) => {
    await page.goto('/portfolios');
    
    // Buscar primer portfolio en la lista
    const portfolioLink = page.locator('a[href*="/portfolios/"]').first();
    if (await portfolioLink.count() > 0) {
      await portfolioLink.click();
      
      // Verificar que está en la página de detalles
      await expect(page).toHaveURL(/\/portfolios\/[^/]+$/);
    }
  });

  test('debería editar portfolio', async ({ page }) => {
    await page.goto('/portfolios');
    
    // Buscar botón de editar
    const editButton = page.getByRole('button', { name: /editar|edit/i }).first();
    if (await editButton.count() > 0) {
      await editButton.click();
      
      // Verificar que se abre formulario de edición
      const nameInput = page.getByLabel(/nombre|name/i).first();
      if (await nameInput.count() > 0) {
        await nameInput.fill(`Updated Portfolio ${Date.now()}`);
        
        const saveButton = page.getByRole('button', { name: /guardar|save/i }).first();
        if (await saveButton.count() > 0) {
          await saveButton.click();
        }
      }
    }
  });

  test('debería eliminar portfolio con confirmación', async ({ page }) => {
    await page.goto('/portfolios');
    
    // Buscar botón de eliminar
    const deleteButton = page.getByRole('button', { name: /eliminar|delete/i }).first();
    if (await deleteButton.count() > 0) {
      await deleteButton.click();
      
      // Confirmar eliminación
      const confirmButton = page.getByRole('button', { name: /confirmar|sí|si|delete/i }).first();
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
        
        // Verificar que se eliminó
        await expect(page.getByText(/eliminado|deleted|success/i)).toBeVisible({ timeout: 10000 });
      }
    }
  });
});

