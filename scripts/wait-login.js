const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to Neon
  await page.goto('https://console.neon.tech');

  // Wait for user to complete login
  console.log('👤 Waiting for you to log in to Neon...');
  console.log('Please complete login in the browser window.');

  try {
    await page.waitForURL('**/dashboard/**', { timeout: 180000 });
    console.log('✓ Logged into Neon!');
    await page.screenshot({
      path: '/Users/prueba/Desktop/Projects/MaatWork/tmp/neon-loggedin.png',
    });
    console.log('Screenshot saved to tmp/neon-loggedin.png');
  } catch (e) {
    console.log('Still waiting... Current URL:', page.url());
  }

  console.log('\nDone. Browser will remain open.');
})();
