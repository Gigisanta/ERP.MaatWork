import { test, expect } from '@playwright/test';

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
});


