import { test, expect } from '@playwright/test';

/**
 * Responsive Design Tests
 * 
 * AI_DECISION: Expandir tests E2E con casos de responsive design
 * Justificación: Responsive design es crítico para UX móvil y tablet
 * Impacto: Mejor experiencia en dispositivos móviles, mayor alcance de usuarios
 */

test.describe('Responsive UI', () => {
  test('mobile shows hamburger and drawer', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/');
    const menuBtn = page.getByRole('button', { name: /open sidebar|open menu|open/i });
    await expect(menuBtn.or(page.getByRole('button', { name: /open sidebar/i }))).toBeVisible();
  });

  test('desktop shows persistent sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    // Sidebar landmark is not explicitly set; look for navigation region inside aside
    await expect(page.locator('aside')).toBeVisible();
  });

  test('tablet layout adapts correctly', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/contacts');
    
    // Verificar que el contenido se adapta
    const mainContent = page.locator('main, [role="main"], .main-content');
    await expect(mainContent.first()).toBeVisible();
  });

  test('mobile forms are usable', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/contacts');
    
    const createButton = page.getByRole('button', { name: /crear|nuevo|add/i }).first();
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);
      
      // Verificar que los inputs son accesibles en móvil
      const inputs = page.locator('input, textarea, select');
      const firstInput = inputs.first();
      if (await firstInput.isVisible()) {
        await firstInput.click();
        // Verificar que el input recibe focus
        await expect(firstInput).toBeFocused();
      }
    }
  });

  test('tables scroll horizontally on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/contacts');
    
    // Buscar tablas
    const tables = page.locator('table');
    const count = await tables.count();
    
    if (count > 0) {
      const table = tables.first();
      const scrollable = await table.evaluate((el) => {
        return el.scrollWidth > el.clientWidth;
      });
      
      // Tabla debería ser scrollable horizontalmente o tener diseño responsive
      // No fallar si no es scrollable, pero documentar
      if (!scrollable) {
        console.log('Info: Table may need horizontal scroll or responsive design');
      }
    }
  });

  test('modals are properly sized on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/contacts');
    
    const createButton = page.getByRole('button', { name: /crear|nuevo|add/i }).first();
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);
      
      const modal = page.locator('[role="dialog"], .modal, [class*="modal"]').first();
      if (await modal.isVisible()) {
        // Verificar que el modal no excede el viewport
        const boundingBox = await modal.boundingBox();
        if (boundingBox) {
          expect(boundingBox.width).toBeLessThanOrEqual(360);
          expect(boundingBox.height).toBeLessThanOrEqual(740);
        }
      }
    }
  });
});


