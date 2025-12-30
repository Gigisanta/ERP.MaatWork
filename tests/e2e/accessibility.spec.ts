import { test, expect } from './fixtures';

/**
 * Accessibility Tests
 *
 * Verifies basic accessibility requirements:
 * - Headings hierarchy
 * - Form labels
 * - Button accessibility
 * - Keyboard navigation
 * - Images alt text
 */

test.describe('Accessibility', () => {
  test('heading hierarchy', async ({ contactsPage, page }) => {
    await contactsPage.gotoList();

    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();

    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);
  });

  test('accessible form labels', async ({ contactsPage, page }) => {
    await contactsPage.gotoList();

    // Check visible inputs
    const inputs = page.locator('input:visible, textarea:visible, select:visible');
    const count = await inputs.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');

      // If it has ID, check for label[for=id]
      let hasLabelTag = false;
      if (id) {
        hasLabelTag = (await page.locator(`label[for="${id}"]`).count()) > 0;
      }

      // Must have at least one way of labeling
      const isLabeled = hasLabelTag || !!ariaLabel || !!ariaLabelledBy;
      expect(isLabeled, `Input ${i} should have a label`).toBeTruthy();
    }
  });

  test('accessible buttons', async ({ contactsPage, page }) => {
    await contactsPage.gotoList();
    const buttons = page.locator('button:visible');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const btn = buttons.nth(i);
      const text = await btn.textContent();
      const ariaLabel = await btn.getAttribute('aria-label');

      expect(
        !!text?.trim() || !!ariaLabel,
        `Button ${i} should have text or aria-label`
      ).toBeTruthy();
    }
  });

  test('keyboard navigation (tab)', async ({ contactsPage, page }) => {
    await contactsPage.gotoList();
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
  });

  test('image alt text', async ({ contactsPage, page }) => {
    await contactsPage.gotoList();
    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt).not.toBeNull(); // alt attribute must exist, even if empty (decorative)
    }
  });
});
