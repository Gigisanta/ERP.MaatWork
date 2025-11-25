import { test, expect } from '@playwright/test';

test('contact detail page renders from contacts list', async ({ page }) => {
  // Go to contacts list
  await page.goto('/contacts');

  // Find first contact link
  const firstContactLink = page.locator('a[href^="/contacts/"]').first();
  const hasLink = await firstContactLink.count();

  test.skip(hasLink === 0, 'No contacts available to open');

  await firstContactLink.click();

  // Expect URL includes /contacts/
  await expect(page).toHaveURL(/\/contacts\//);

  // Expect some heading or content present
  const heading = page.getByRole('heading');
  await expect(heading).toBeVisible();
});


