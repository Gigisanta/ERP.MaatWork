const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('=== TOKEN COLLECTION BROWSER ===\n');
  console.log('I will open multiple tabs. Please:');
  console.log('1. Log in to each service if needed');
  console.log('2. Create/get the required tokens');
  console.log('3. Tell me the values\n');

  // VERCEL - Tokens page
  console.log('Opening Vercel tokens page...');
  await page.goto('https://vercel.com/account/tokens');

  // Wait for manual interaction
  console.log('\n👤 Please:');
  console.log('   - Log in to Vercel if needed');
  console.log('   - Create a new token (or copy existing)');
  console.log('   - Tell me the token value');
  console.log('\nPress Enter in terminal when done with Vercel...');

  // Wait for user to complete Vercel
  await new Promise((resolve) => {
    process.stdin.once('data', resolve);
  });

  await page.screenshot({ path: '/Users/prueba/Desktop/Projects/MaatWork/tmp/vercel-done.png' });
  console.log('✓ Vercel screenshot saved\n');

  // RENDER - API Keys page
  console.log('Opening Render API keys page...');
  await page.goto('https://render.com/account/api-keys');

  console.log('\n👤 Please:');
  console.log('   - Log in to Render if needed');
  console.log('   - Create a new API key');
  console.log('   - Tell me the API key value');
  console.log('\nPress Enter in terminal when done with Render...');

  await new Promise((resolve) => {
    process.stdin.once('data', resolve);
  });

  await page.screenshot({ path: '/Users/prueba/Desktop/Projects/MaatWork/tmp/render-done.png' });
  console.log('✓ Render screenshot saved\n');

  // VERCEL - Get Project ID
  console.log('Opening Vercel dashboard...');
  await page.goto('https://vercel.com/dashboard');

  console.log('\n👤 Please:');
  console.log('   - Click on your MaatWork project');
  console.log('   - Go to Settings → General');
  console.log('   - Tell me: Vercel Org ID and Vercel Project ID');
  console.log('\nPress Enter when done...');

  await new Promise((resolve) => {
    process.stdin.once('data', resolve);
  });

  await page.screenshot({ path: '/Users/prueba/Desktop/Projects/MaatWork/tmp/vercel-project.png' });

  // RENDER - Get Service ID
  console.log('\nOpening Render services...');
  await page.goto('https://dashboard.render.com');

  console.log('\n👤 Please:');
  console.log('   - Find your maatwork-api service');
  console.log('   - Copy the Service ID from the URL (srv-xxxxx)');
  console.log('   - Tell me the Service ID');
  console.log('\nPress Enter when done...');

  await new Promise((resolve) => {
    process.stdin.once('data', resolve);
  });

  await page.screenshot({ path: '/Users/prueba/Desktop/Projects/MaatWork/tmp/render-service.png' });

  console.log('\n=== ALL DONE ===');
  console.log('Screenshots saved to tmp/ folder');

  await browser.close();
})();
