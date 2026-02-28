const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();

  const results = {};

  console.log('=== GETTING ALL REQUIRED TOKENS ===\n');

  // ===== 1. VERCEL =====
  console.log('1. 🌐 VERCEL - Getting tokens...');
  await page.goto('https://vercel.com/account/tokens');
  await page.waitForTimeout(3000);

  if (page.url().includes('login')) {
    console.log('   👤 Please log in to Vercel with GitHub');
    await page.waitForURL('**/account/tokens**', { timeout: 120000 });
  }

  // Try to create token or get existing
  try {
    await page.click('text=Create Token', { timeout: 5000 }).catch(async () => {
      console.log('   Trying to find token input...');
    });
    await page.waitForTimeout(2000);

    // Take screenshot to see what we have
    await page.screenshot({
      path: '/Users/prueba/Desktop/Projects/MaatWork/tmp/vercel-tokens.png',
    });
    console.log('   Screenshot saved - please check the page');
  } catch (e) {
    console.log('   Could not create token automatically');
  }

  // ===== 2. RENDER =====
  console.log('\n2. 🔧 RENDER - Getting API key...');
  await page.goto('https://render.com/account/api-keys');
  await page.waitForTimeout(3000);

  if (page.url().includes('login')) {
    console.log('   👤 Please log in to Render with GitHub');
    await page.waitForURL('**/account/api-keys**', { timeout: 120000 });
  }

  await page.screenshot({ path: '/Users/prueba/Desktop/Projects/MaatWork/tmp/render-keys.png' });

  // ===== 3. GET PROJECT IDs =====
  console.log('\n3. 📊 Getting Vercel Project IDs...');
  await page.goto('https://vercel.com/dashboard');
  await page.waitForTimeout(2000);

  // Click on the project to get ID
  const projectCards = await page.$$('[class*="project"]');
  await page.screenshot({
    path: '/Users/prueba/Desktop/Projects/MaatWork/tmp/vercel-projects.png',
  });

  console.log('\n=== SCREENSHOTS SAVED ===');
  console.log('Please check the tmp/ folder for screenshots');
  console.log('\nBrowser will remain open. Complete the following:');
  console.log('1. In Vercel: Create a token or copy existing one');
  console.log('2. In Render: Create an API key or copy existing one');
  console.log('3. Tell me the values when done');

  // Keep browser open
  await page.waitForTimeout(60000);

  await browser.close();
})();
