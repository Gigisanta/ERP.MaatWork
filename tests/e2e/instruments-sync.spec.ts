import { test, expect } from './fixtures';

test.describe('Analytics and Instruments', () => {
  test('verify analytics dashboard loads charts', async ({ analyticsPage }) => {
    await analyticsPage.gotoDashboard();
    await analyticsPage.expectChartsVisible();
  });

  test('sync instruments with python service', async ({ analyticsPage }) => {
    // This assumes the Python service is running and connected
    await analyticsPage.syncInstruments();
    
    // Verify a well-known ticker updated (mock check)
    // await analyticsPage.checkInstrumentPrice('AAPL', /\$/);
  });
});

