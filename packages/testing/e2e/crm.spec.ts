import { test, expect } from '@playwright/test';

test.describe('CRM Features', () => {
  test.beforeEach(async ({ page }) => {
    // Set authenticated state
    await page.goto('/');
    // You can add login logic here or use authentication state files
  });

  test('should display CRM contacts', async ({ page }) => {
    await page.goto('/crm');
    
    // Wait for contacts table or list
    await expect(page.locator('table, [data-testid="contacts-list"]')).toBeVisible();
  });

  test('should filter contacts by status', async ({ page }) => {
    await page.goto('/crm');
    
    // Click on status filter
    const statusFilter = page.locator('button:has-text("Status")').first();
    await statusFilter.click();
    
    // Select a status
    await page.locator('button:has-text("New"), button:has-text("Nuevo")').click();
    
    // Verify filtered results
    await expect(page.locator('table tr')).toHaveCount({ min: 1 });
  });
});

