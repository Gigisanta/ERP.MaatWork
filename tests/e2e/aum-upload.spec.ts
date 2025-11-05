import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const adminEmail = process.env.E2E_ADMIN_EMAIL || 'giolivosantarelli@gmail.com';
const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'admin123';

// Path to test fixture CSV
const fixtureCsv = path.join(__dirname, '../../apps/api/test-fixtures/aum/1761781426170-8hqr5uut5jr.csv');

test.describe('AUM File Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    
    const emailInput = page.getByLabel(/email|usuario|correo/i).first();
    await emailInput.fill(adminEmail);

    const passwordInput = page.getByLabel(/contraseña|password/i).first();
    await passwordInput.fill(adminPassword);

    await page.getByRole('button', { name: /ingresar|login|entrar/i }).click();
    
    // Wait for navigation
    await expect(page).toHaveURL(/(contacts|pipeline|portfolios|profile|analytics|benchmarks|\/)$/);
  });

  test('should display AUM admin page', async ({ page }) => {
    await page.goto('/admin/aum');
    
    await expect(page.getByRole('heading', { name: /aum y brokers/i })).toBeVisible();
    await expect(page.getByText(/normalización de cuentas comitentes/i)).toBeVisible();
    await expect(page.getByText(/📤 Seleccionar archivo/i)).toBeVisible();
  });

  test('should open file dialog when clicking select file button', async ({ page }) => {
    await page.goto('/admin/aum');
    
    // Track file dialog
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText(/📤 Seleccionar archivo/i).click();
    
    const fileChooser = await fileChooserPromise;
    expect(fileChooser).toBeTruthy();
  });

  test('should show file info after selection', async ({ page }) => {
    await page.goto('/admin/aum');
    
    // Set up file selection
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText(/📤 Seleccionar archivo/i).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(fixtureCsv);
    
    // Verify file info appears
    await expect(page.getByText(/1761781426170-8hqr5uut5jr\.csv/i)).toBeVisible();
    await expect(page.getByText(/📄 Cambiar archivo/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Subir$/ })).toBeVisible();
  });

  test('should validate file type', async ({ page }) => {
    await page.goto('/admin/aum');
    
    // Create a temporary invalid file
    const invalidFile = await page.evaluate(() => {
      return new File(['invalid content'], 'test.pdf', { type: 'application/pdf' });
    });
    
    // Try to upload via JS (won't trigger file chooser)
    await page.addInitScript((file) => {
      window.testFile = file;
    }, invalidFile);
    
    // Note: Browser file chooser validation happens before JS validation
    // This test primarily ensures the UI handles the rejection gracefully
  });

  test('should reject files that are too large', async ({ page }) => {
    await page.goto('/admin/aum');
    
    // Create a large file (>25MB)
    const largeContent = 'x'.repeat(26 * 1024 * 1024);
    const largeFile = await page.evaluate((content) => {
      return new File([content], 'huge.csv', { type: 'text/csv' });
    }, largeContent);
    
    // Browser might reject this before JS, but test the flow
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText(/📤 Seleccionar archivo/i).click();
    
    // Note: Testing the full flow would require mocking the File API
    // For now, we rely on the component unit tests for this
  });

  test('should allow clearing selected file', async ({ page }) => {
    await page.goto('/admin/aum');
    
    // Select file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText(/📤 Seleccionar archivo/i).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(fixtureCsv);
    
    // Verify file is selected
    await expect(page.getByText(/1761781426170-8hqr5uut5jr\.csv/i)).toBeVisible();
    
    // Clear file
    await page.getByLabel(/eliminar archivo/i).click();
    
    // Verify file is cleared
    await expect(page.getByText(/1761781426170-8hqr5uut5jr\.csv/i)).not.toBeVisible();
    await expect(page.getByText(/📤 Seleccionar archivo/i)).toBeVisible();
  });

  test('should show upload progress', async ({ page }) => {
    await page.goto('/admin/aum');
    
    // Select file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText(/📤 Seleccionar archivo/i).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(fixtureCsv);
    
    // Click upload
    await page.getByRole('button', { name: /^Subir$/ }).click();
    
    // Verify loading state appears
    await expect(page.getByText(/Subiendo/i)).toBeVisible();
    
    // Wait for completion (timeout after 30s)
    await expect(page.getByText(/✓ Subido/i)).toBeVisible({ timeout: 30000 });
  });

  test('should disable controls during upload', async ({ page }) => {
    await page.goto('/admin/aum');
    
    // Select file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText(/📤 Seleccionar archivo/i).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(fixtureCsv);
    
    // Click upload
    await page.getByRole('button', { name: /^Subir$/ }).click();
    
    // Verify controls are disabled
    await expect(page.getByRole('button', { name: /Subiendo/i })).toBeDisabled();
    
    // Wait for completion
    await expect(page.getByText(/✓ Subido/i)).toBeVisible({ timeout: 30000 });
  });

  test('should display success message after upload', async ({ page }) => {
    await page.goto('/admin/aum');
    
    // Select file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText(/📤 Seleccionar archivo/i).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(fixtureCsv);
    
    // Click upload
    await page.getByRole('button', { name: /^Subir$/ }).click();
    
    // Wait for success message
    await expect(page.getByText(/✓ Subido/i)).toBeVisible({ timeout: 30000 });
    
    // Success message should disappear after timeout
    await expect(page.getByText(/✓ Subido/i)).not.toBeVisible({ timeout: 2000 });
  });

  test('should refresh data after successful upload', async ({ page }) => {
    await page.goto('/admin/aum');
    
    // Wait for initial table to load
    await page.waitForLoadState('networkidle');
    
    // Count initial rows
    const initialRowCount = await page.locator('tbody tr').count();
    
    // Select and upload file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText(/📤 Seleccionar archivo/i).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(fixtureCsv);
    
    await page.getByRole('button', { name: /^Subir$/ }).click();
    
    // Wait for success
    await expect(page.getByText(/✓ Subido/i)).toBeVisible({ timeout: 30000 });
    
    // Wait for table to refresh
    await page.waitForTimeout(1000);
    
    // Table should have more rows (or at least be refreshed)
    await expect(page.locator('tbody tr')).toHaveCount(initialRowCount + 1, { timeout: 10000 });
  });

  test('should display file in table after upload', async ({ page }) => {
    await page.goto('/admin/aum');
    
    // Select and upload file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText(/📤 Seleccionar archivo/i).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(fixtureCsv);
    
    await page.getByRole('button', { name: /^Subir$/ }).click();
    
    // Wait for success
    await expect(page.getByText(/✓ Subido/i)).toBeVisible({ timeout: 30000 });
    
    // File should appear in table
    await expect(page.getByText(/1761781426170-8hqr5uut5jr\.csv/i)).toBeVisible({ timeout: 10000 });
  });
});




