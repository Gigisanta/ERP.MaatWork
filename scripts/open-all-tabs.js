const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('=== BROWSER OPEN - PLEASE COMPLETE THESE TASKS ===\n');

  // Open all required pages in tabs
  await page.goto('https://vercel.com/account/tokens');
  console.log('Tab 1: Vercel Tokens - Create a token');

  const page2 = await context.newPage();
  await page2.goto('https://render.com/account/api-keys');
  console.log('Tab 2: Render API Keys - Create an API key');

  const page3 = await context.newPage();
  await page3.goto('https://vercel.com/dashboard');
  console.log('Tab 3: Vercel Dashboard - Get Org ID and Project ID');

  const page4 = await context.newPage();
  await page4.goto('https://dashboard.render.com');
  console.log('Tab 4: Render Dashboard - Get Service ID');

  console.log('\n=== INSTRUCTIONS ===');
  console.log('1. In Tab 1 (Vercel): Create a token');
  console.log('2. In Tab 2 (Render): Create an API key');
  console.log(
    '3. In Tab 3 (Vercel): Click project → Settings → General → Copy Org ID and Project ID'
  );
  console.log('4. In Tab 4 (Render): Click your service → Copy Service ID from URL');
  console.log('\nWhen done, please tell me the values!');
  console.log('\nBrowser will stay open for 5 minutes...');

  // Wait 5 minutes for user to complete
  await page.waitForTimeout(300000);

  await browser.close();
  console.log('\nDone');
})();
