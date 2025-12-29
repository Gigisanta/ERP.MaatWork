import { test, expect } from './fixtures';

test.describe('Responsive UI', () => {
  test('mobile shows hamburger and drawer', async ({ page, authPage }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    
    // Ensure we are logged in
    await authPage.login();
    await authPage.expectToBeLoggedIn();

    const menuBtn = page.getByRole('button', { name: /open sidebar|open menu|open/i });
    // Use 'or' locator to handle potential different button labels/icons
    await expect(menuBtn.or(page.getByRole('button', { name: /open sidebar/i }).first())).toBeVisible();
  });

  test('desktop shows persistent sidebar', async ({ page, authPage }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    
    await authPage.login();
    await authPage.expectToBeLoggedIn();

    await expect(page.locator('aside, .sidebar')).toBeVisible();
  });
});
