const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('=== NEON SETUP ===');
  console.log('Opening Neon...');
  await page.goto('https://console.neon.tech');
  await page.waitForTimeout(5000);

  console.log('Current URL:', page.url());
  await page.screenshot({ path: '/Users/prueba/Desktop/Projects/MaatWork/tmp/neon-step1.png' });

  // Wait for user to log in
  console.log('\n👤 Please log in to Neon in the browser window.');
  console.log('Press Enter here when you see the Neon dashboard...');

  // Wait for navigation away from login
  await page.waitForURL('**/dashboard**', { timeout: 120000 }).catch(() => {});
  console.log('URL after wait:', page.url());

  if (page.url().includes('dashboard')) {
    console.log('✓ Logged into Neon!');
    await page.screenshot({
      path: '/Users/prueba/Desktop/Projects/MaatWork/tmp/neon-loggedin.png',
    });
  }

  await browser.close();
})();
