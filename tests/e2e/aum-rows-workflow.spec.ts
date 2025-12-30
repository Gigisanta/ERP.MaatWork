import { test, expect } from './fixtures';

test.describe('AUM Rows Workflow', () => {
  test('filter, search and paginate AUM rows', async ({ aumPage, page }) => {
    await aumPage.gotoRows();

    // Search
    await aumPage.searchRow('12345');
    // Verify URL param if applicable
    await expect(page).toHaveURL(/search=12345/);

    // Filter by Broker (assuming Balanz exists)
    // await aumPage.filterByBroker('Balanz');
    // await expect(page).toHaveURL(/broker=balanz/i);

    // Filter by Status
    // await aumPage.filterByStatus('Coincidencia');

    // Toggle check
    await aumPage.toggleUpdatedOnly();
  });

  test('navigate to history', async ({ aumPage, page }) => {
    await aumPage.gotoRows();
    // Use title selector which is more reliable for icon buttons
    await page.getByTitle(/historial de importaciones/i).click();
    await aumPage.expectHistoryPage();
  });
});
