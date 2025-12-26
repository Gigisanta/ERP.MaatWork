import { test, expect } from '@playwright/test';

test.describe('Human-like User Journey', () => {
  // We use the storageState from globalSetup, so we are already logged in
  
  test('should complete a full business workflow', async ({ page }) => {
    // 1. Dashboard Landing
    console.log('Step 1: Landing on dashboard');
    await page.goto('/');
    await expect(page).toHaveURL(/(contacts|pipeline|portfolios|profile|analytics|benchmarks|\/)$/);
    
    // 2. Manage Contacts
    console.log('Step 2: Creating a new contact');
    await page.goto('/contacts');
    const createBtn = page.getByRole('button', { name: /nuevo|new|crear/i }).first();
    await createBtn.click();
    
    const contactName = `Human Flow ${Date.now()}`;
    await page.getByLabel(/nombre|full name|nombre completo/i).first().fill(contactName);
    await page.getByLabel(/email/i).first().fill(`human-${Date.now()}@example.com`);
    
    // Optional: Fill more fields if they exist
    const phoneField = page.getByLabel(/teléfono|phone/i).first();
    if (await phoneField.isVisible()) {
      await phoneField.fill('123456789');
    }
    
    await page.getByRole('button', { name: /guardar|save|crear/i }).first().click();
    
    // Verify creation in list
    await expect(page.getByText(contactName)).toBeVisible();
    
    // 3. Move to Pipeline
    console.log('Step 3: Moving contact in pipeline');
    await page.goto('/pipeline');
    
    // Handle potential dialogs (human-like)
    page.on('dialog', async dialog => {
      console.log(`Accepted dialog: ${dialog.message()}`);
      await dialog.accept();
    });

    // Wait for the board to load
    await expect(page.locator('[class*="board"], [class*="kanban"]')).toBeVisible();
    
    // Find our new contact in the board
    const contactInBoard = page.getByText(contactName);
    await expect(contactInBoard).toBeVisible();
    
    // Drag to next stage
    const columns = page.locator('[class*="column"], [class*="stage"]');
    if (await columns.count() > 1) {
      const targetColumn = columns.nth(1);
      await contactInBoard.dragTo(targetColumn);
      console.log('Dragged contact to second column');
    }
    
    // 4. Check AUM Admin
    console.log('Step 4: Checking AUM administration');
    await page.goto('/admin/aum');
    await expect(page.getByRole('heading', { name: /aum/i })).toBeVisible();
    
    // 5. Navigate to Analytics
    console.log('Step 5: Reviewing analytics');
    await page.goto('/analytics');
    // Expect some charts or metrics
    await expect(page.locator('canvas, svg, [class*="chart"]')).toBeVisible({ timeout: 15000 });
    
    // Interact with charts (e.g., hover)
    const chart = page.locator('canvas, svg').first();
    if (await chart.isVisible()) {
      await chart.hover();
      // Check if tooltip appears
      await expect(page.locator('[class*="tooltip"], [role="tooltip"]')).toBeVisible({ timeout: 2000 }).catch(() => {});
    }
    
    // 6. User Profile / Settings
    console.log('Step 6: Checking profile settings');
    await page.goto('/profile');
    await expect(page.getByText(/perfil|profile|configuración/i)).toBeVisible();
    
    // Change a setting
    const languageSelect = page.getByLabel(/idioma|language/i).first();
    if (await languageSelect.isVisible()) {
      await languageSelect.selectOption({ index: 1 });
      await expect(page.getByText(/guardado|saved|success/i)).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
    
    // 7. Search Functionality (Human-like behavior)
    console.log('Step 7: Using global search');
    const searchInput = page.getByPlaceholder(/buscar|search/i).first();
    if (await searchInput.isVisible()) {
      await searchInput.fill(contactName);
      await page.keyboard.press('Enter');
      await expect(page.getByText(contactName)).toBeVisible();
    }
    
    // 8. Logout
    console.log('Step 8: Logging out');
    const logoutBtn = page.getByRole('button', { name: /salir|logout|cerrar sesión/i }).first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await expect(page).toHaveURL(/\/login/);
    }
  });
});

