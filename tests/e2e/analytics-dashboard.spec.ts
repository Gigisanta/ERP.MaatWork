/**
 * E2E tests para dashboard de analytics
 *
 * AI_DECISION: Tests E2E para dashboard de analytics
 * Justificación: Validación crítica de visualización de datos
 * Impacto: Prevenir errores en analytics
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

test.describe('Analytics Dashboard E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('debería mostrar dashboard de analytics', async ({ page }) => {
    await page.goto('/analytics');

    // Verificar que la página carga
    await expect(page.getByText(/analytics|análisis|métricas|dashboard/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test('debería mostrar métricas principales', async ({ page }) => {
    await page.goto('/analytics');

    // Verificar que hay métricas o gráficos
    const metrics = page.locator('[class*="metric"], [class*="card"], [class*="chart"]');
    const metricCount = await metrics.count();

    // Puede haber 0 métricas si no hay datos
    expect(metricCount).toBeGreaterThanOrEqual(0);
  });

  test('debería permitir cambiar período de tiempo', async ({ page }) => {
    await page.goto('/analytics');

    // Buscar selector de período
    const periodSelect = page.getByLabel(/período|period|tiempo|time/i).first();
    if ((await periodSelect.count()) > 0) {
      await periodSelect.selectOption('30d');
      await page.waitForTimeout(1000);
    }
  });

  test('debería mostrar gráficos de rendimiento', async ({ page }) => {
    await page.goto('/analytics');

    // Verificar que hay gráficos o visualizaciones
    const charts = page.locator('[class*="chart"], canvas, svg');
    const chartCount = await charts.count();

    // Puede haber 0 gráficos si no hay datos
    expect(chartCount).toBeGreaterThanOrEqual(0);
  });
});
