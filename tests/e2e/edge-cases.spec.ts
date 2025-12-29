import { test, expect } from './fixtures';

test.describe('Edge Cases', () => {
  test('handle very long text inputs', async ({ contactsPage, page }) => {
    const longName = 'A'.repeat(1000);
    await contactsPage.gotoList();
    
    // We use lower level page interaction here as we are testing the form specifically with bad data
    // But we use POM for navigation
    await contactsPage.newContactButton.click();
    await page.getByLabel(/nombre|first name/i).fill(longName);
    
    // Verify no crash
    await expect(page.getByLabel(/nombre|first name/i)).toHaveValue(longName);
  });

  test('handle special characters in search', async ({ contactsPage }) => {
    const specialChars = ['<script>', '{{', '}}', '&', '"', "'"];
    await contactsPage.gotoList();

    for (const char of specialChars) {
        await contactsPage.searchContact(char);
        // Ensure no crash/error
    }
  });

  test('handle browser navigation', async ({ contactsPage, page }) => {
    await contactsPage.gotoList();
    await page.goto('/portfolios');
    await page.goBack();
    await expect(page).toHaveURL(/contacts/);
    await page.goForward();
    await expect(page).toHaveURL(/portfolios/);
  });
});
