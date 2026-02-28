const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to Neon
  await page.goto('https://console.neon.tech');
  await page.waitForTimeout(3000);

  // Take screenshot
  await page.screenshot({ path: '/Users/prueba/Desktop/Projects/MaatWork/tmp-neon.png' });

  console.log('Current URL:', page.url());
  console.log('Title:', await page.title());

  await browser.close();
})();
