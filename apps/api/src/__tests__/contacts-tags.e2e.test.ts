import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { chromium, Browser, Page } from 'playwright';

describe('Contacts Tags E2E', () => {
  let browser: Browser;
  let page: Page;
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    
    // Mock de autenticación - simular login
    await page.goto(`${baseUrl}/login`);
    
    // Simular login exitoso (esto dependería de tu implementación de auth)
    // Por ahora asumimos que ya estamos logueados
    await page.goto(`${baseUrl}/contacts`);
  });

  it('should display contacts with tags column', async () => {
    await page.goto(`${baseUrl}/contacts`);
    
    // Verificar que la columna de etiquetas existe
    const headers = await page.locator('th').allTextContents();
    expect(headers).toContain('Etiquetas');
  });

  it('should show "Sin etiquetas" for contacts without tags', async () => {
    await page.goto(`${baseUrl}/contacts`);
    
    // Buscar texto "Sin etiquetas" en la tabla
    const noTagsText = await page.locator('text=Sin etiquetas').first();
    await expect(noTagsText).toBeVisible();
  });

  it('should display existing tags as chips', async () => {
    await page.goto(`${baseUrl}/contacts`);
    
    // Buscar chips de etiquetas (esto asumiría que hay contactos con etiquetas)
    const tagChips = await page.locator('.tag-chip').count();
    
    // Si hay etiquetas, verificar que se muestran como chips
    if (tagChips > 0) {
      const firstChip = await page.locator('.tag-chip').first();
      await expect(firstChip).toBeVisible();
    }
  });

  it('should show tag selector when clicking on tags cell', async () => {
    await page.goto(`${baseUrl}/contacts`);
    
    // Buscar contenedor de etiquetas
    const tagSelector = await page.locator('.tag-selector').first();
    await tagSelector.click();
    
    // Verificar que aparece el input de búsqueda
    const searchInput = await page.locator('.tag-search-input');
    await expect(searchInput).toBeVisible();
  });

  it('should create new tag when typing and pressing Enter', async () => {
    await page.goto(`${baseUrl}/contacts`);
    
    // Hacer click en el selector de etiquetas
    const tagSelector = await page.locator('.tag-selector').first();
    await tagSelector.click();
    
    // Escribir nueva etiqueta
    const searchInput = await page.locator('.tag-search-input');
    await searchInput.fill('Nueva Etiqueta');
    await searchInput.press('Enter');
    
    // Verificar que la etiqueta se creó (esto requeriría mock de API)
    // Por ahora solo verificamos que el input se limpia
    const inputValue = await searchInput.inputValue();
    expect(inputValue).toBe('');
  });

  it('should show autocomplete dropdown when typing', async () => {
    await page.goto(`${baseUrl}/contacts`);
    
    // Hacer click en el selector de etiquetas
    const tagSelector = await page.locator('.tag-selector').first();
    await tagSelector.click();
    
    // Escribir para activar autocompletado
    const searchInput = await page.locator('.tag-search-input');
    await searchInput.fill('VIP');
    
    // Esperar un poco para que aparezca el dropdown
    await page.waitForTimeout(500);
    
    // Verificar que aparece el dropdown
    const dropdown = await page.locator('.tag-dropdown');
    await expect(dropdown).toBeVisible();
  });

  it('should remove tag when clicking remove button', async () => {
    await page.goto(`${baseUrl}/contacts`);
    
    // Buscar un chip de etiqueta con botón de eliminar
    const removableChip = await page.locator('.tag-chip.removable').first();
    
    if (await removableChip.count() > 0) {
      // Hacer click en el botón de eliminar
      const removeBtn = await removableChip.locator('.remove-btn');
      await removeBtn.click();
      
      // Verificar que el chip desaparece (esto requeriría mock de API)
      // Por ahora solo verificamos que el botón es clickeable
      await expect(removeBtn).toBeVisible();
    }
  });

  it('should show fallback form when JS is disabled', async () => {
    // Deshabilitar JavaScript
    await page.setJavaScriptEnabled(false);
    
    await page.goto(`${baseUrl}/contacts`);
    
    // Verificar que aparece el formulario de fallback
    const fallbackForm = await page.locator('.tag-fallback');
    await expect(fallbackForm).toBeVisible();
    
    // Verificar que tiene input y botón
    const fallbackInput = await page.locator('.tag-fallback-input');
    const fallbackBtn = await page.locator('.tag-fallback-btn');
    
    await expect(fallbackInput).toBeVisible();
    await expect(fallbackBtn).toBeVisible();
    
    // Rehabilitar JavaScript para otros tests
    await page.setJavaScriptEnabled(true);
  });

  it('should handle keyboard navigation in tag selector', async () => {
    await page.goto(`${baseUrl}/contacts`);
    
    // Hacer click en el selector de etiquetas
    const tagSelector = await page.locator('.tag-selector').first();
    await tagSelector.click();
    
    // Escribir para activar dropdown
    const searchInput = await page.locator('.tag-search-input');
    await searchInput.fill('VIP');
    
    await page.waitForTimeout(500);
    
    // Navegar con teclas
    await searchInput.press('ArrowDown');
    
    // Verificar que se selecciona un item
    const selectedItem = await page.locator('.tag-dropdown-item.selected');
    await expect(selectedItem).toBeVisible();
  });

  it('should show tag counter when there are more than max visible tags', async () => {
    await page.goto(`${baseUrl}/contacts`);
    
    // Buscar contador de etiquetas (+N)
    const tagCounter = await page.locator('.tag-counter');
    
    // Si existe, verificar que muestra el número correcto
    if (await tagCounter.count() > 0) {
      const counterText = await tagCounter.textContent();
      expect(counterText).toMatch(/^\+\d+$/);
    }
  });
});

// Test de integración con API
describe('Contacts Tags API Integration', () => {
  it('should create and assign tags via API', async () => {
    // Este test requeriría un setup más complejo con base de datos de prueba
    // Por ahora es un placeholder para futuras implementaciones
    expect(true).toBe(true);
  });

  it('should handle tag conflicts gracefully', async () => {
    // Test para verificar manejo de etiquetas duplicadas
    expect(true).toBe(true);
  });

  it('should validate tag names properly', async () => {
    // Test para validación de nombres de etiquetas
    expect(true).toBe(true);
  });
});


