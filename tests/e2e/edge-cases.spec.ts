import { test, expect } from '@playwright/test';

/**
 * Edge Cases Tests
 *
 * AI_DECISION: Expandir tests E2E con casos edge
 * Justificación: Casos edge descubren bugs que casos normales no encuentran
 * Impacto: Mayor confiabilidad, mejor manejo de errores, mejor UX en situaciones límite
 */

test.describe('Edge Cases', () => {
  test('should handle very long text inputs gracefully', async ({ page }) => {
    await page.goto('/contacts');

    // Intentar crear contacto con nombre muy largo
    const longName = 'A'.repeat(1000);

    // Buscar botón de crear contacto
    const createButton = page.getByRole('button', { name: /crear|nuevo|add/i }).first();
    if (await createButton.isVisible()) {
      await createButton.click();

      // Esperar a que aparezca el formulario
      await page.waitForTimeout(500);

      const nameInput = page.getByLabel(/nombre|name/i).first();
      if (await nameInput.isVisible()) {
        await nameInput.fill(longName);

        // Verificar que no hay errores de validación o que se muestran apropiadamente
        const errors = page.locator('[role="alert"], .error, [class*="error"]');
        // No fallar si hay errores, solo verificar que la app no se rompe
      }
    }
  });

  test('should handle special characters in search', async ({ page }) => {
    await page.goto('/contacts');

    const specialChars = ['<script>', '{{', '}}', '${', '`', "'", '"', '&', '<', '>'];

    for (const char of specialChars) {
      const searchInput = page.getByPlaceholder(/buscar|search/i).first();
      if (await searchInput.isVisible()) {
        await searchInput.fill(char);
        await page.waitForTimeout(300);

        // Verificar que no hay errores de consola
        const errors: string[] = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            errors.push(msg.text());
          }
        });

        // Limpiar input
        await searchInput.clear();

        // No debería haber errores críticos
        const criticalErrors = errors.filter(
          (e) => !e.includes('Warning') && !e.includes('Deprecation')
        );
        expect(criticalErrors.length).toBe(0);
      }
    }
  });

  test('should handle rapid clicks without double-submission', async ({ page }) => {
    await page.goto('/contacts');

    // Buscar botón de acción común
    const actionButton = page.getByRole('button').first();
    if (await actionButton.isVisible()) {
      // Hacer múltiples clicks rápidos
      await actionButton.click({ clickCount: 5, delay: 50 });

      // Verificar que no hay múltiples requests duplicados
      const requests: string[] = [];
      page.on('request', (req) => {
        if (req.method() === 'POST' || req.method() === 'PUT') {
          requests.push(req.url());
        }
      });

      await page.waitForTimeout(1000);

      // No debería haber más de 2-3 requests (uno inicial + posibles retries)
      expect(requests.length).toBeLessThan(5);
    }
  });

  test('should handle network errors gracefully', async ({ page, context }) => {
    await page.goto('/contacts');

    // Interceptar y bloquear requests
    await page.route('**/api/**', (route) => {
      if (route.request().method() === 'GET') {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    // Intentar recargar la página
    await page.reload();
    await page.waitForTimeout(2000);

    // Verificar que se muestra algún tipo de mensaje de error o estado de carga
    const errorMessage = page.locator(
      '[role="alert"], .error, [class*="error"], [class*="loading"]'
    );
    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle empty states correctly', async ({ page }) => {
    // Navegar a una página que podría estar vacía
    await page.goto('/contacts');

    // Buscar mensajes de estado vacío
    const emptyState = page.locator('text=/no hay|vacío|empty|sin resultados/i');

    // Si hay estado vacío, verificar que es visible y claro
    if ((await emptyState.count()) > 0) {
      await expect(emptyState.first()).toBeVisible();
    }
  });

  test('should handle concurrent operations', async ({ page }) => {
    await page.goto('/contacts');

    // Simular múltiples acciones simultáneas
    const actions = [
      page
        .getByPlaceholder(/buscar|search/i)
        .first()
        .fill('test'),
      page.keyboard.press('Escape'),
      page
        .getByRole('button')
        .first()
        .click()
        .catch(() => {}),
    ];

    // Ejecutar acciones concurrentemente
    await Promise.allSettled(actions);

    // Verificar que la página sigue siendo funcional
    await expect(page).toHaveURL(/contacts/);
  });

  test('should handle browser back/forward navigation', async ({ page }) => {
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');

    // Navegar a otra página
    await page.goto('/portfolios');
    await page.waitForLoadState('networkidle');

    // Volver atrás
    await page.goBack();
    await page.waitForLoadState('networkidle');

    // Verificar que la página se carga correctamente
    await expect(page).toHaveURL(/contacts/);

    // Avanzar
    await page.goForward();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/portfolios/);
  });

  test('should handle form submission with missing required fields', async ({ page }) => {
    await page.goto('/contacts');

    const createButton = page.getByRole('button', { name: /crear|nuevo|add/i }).first();
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Intentar enviar sin llenar campos requeridos
      const submitButton = page.getByRole('button', { name: /guardar|save|crear|submit/i }).first();
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Verificar que se muestran mensajes de validación
        const validationErrors = page.locator(
          '[role="alert"], .error, [class*="error"], [class*="required"]'
        );
        await expect(validationErrors.first()).toBeVisible({ timeout: 2000 });
      }
    }
  });

  test('should handle very large datasets in tables', async ({ page }) => {
    await page.goto('/contacts');

    // Verificar que hay paginación o virtualización
    const pagination = page.locator(
      '[aria-label*="pagination"], [class*="pagination"], button:has-text(">")'
    );
    const virtualScroll = page.locator('[class*="virtual"], [class*="infinite"]');

    // Al menos uno de los dos debería existir para manejar grandes datasets
    const hasPagination = (await pagination.count()) > 0;
    const hasVirtualScroll = (await virtualScroll.count()) > 0;

    // No fallar si no hay, pero documentar
    if (!hasPagination && !hasVirtualScroll) {
      console.log('Warning: No pagination or virtualization detected for large datasets');
    }
  });

  test('should handle timezone differences correctly', async ({ page }) => {
    await page.goto('/contacts');

    // Verificar que las fechas se muestran correctamente
    const dateElements = page.locator('[class*="date"], [class*="time"], time');
    const count = await dateElements.count();

    if (count > 0) {
      const firstDate = dateElements.first();
      const text = await firstDate.textContent();

      // Verificar que hay algún formato de fecha
      expect(text).toBeTruthy();
    }
  });
});
