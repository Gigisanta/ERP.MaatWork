const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Storage for credentials
  const credentials = {
    neon: null,
    vercel: null,
    render: null,
  };

  console.log('='.repeat(50));
  console.log('MULTI-SERVICE LOGIN & SETUP');
  console.log('='.repeat(50));

  // ===== STEP 1: NEON =====
  console.log('\n📊 STEP 1: NEON (Database)');
  console.log('-'.repeat(30));
  await page.goto('https://console.neon.tech');
  await page.waitForTimeout(2000);

  if (page.url().includes('login')) {
    console.log('👤 Please log in to Neon (use GitHub)');
    await page.waitForURL('**/dashboard/**', { timeout: 120000 });
  }
  console.log('✓ Logged into Neon!');
  await page.screenshot({
    path: '/Users/prueba/Desktop/Projects/MaatWork/tmp/1-neon-loggedin.png',
  });

  // Create project if needed
  console.log('Creating project "maatwork-db"...');
  try {
    await page.click('text=New Project', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
  } catch (e) {
    console.log('Project might already exist or different UI');
  }

  // ===== STEP 2: VERCEL =====
  console.log('\n🌐 STEP 2: VERCEL (Web)');
  console.log('-'.repeat(30));
  await page.goto('https://vercel.com');

  if (page.url().includes('login')) {
    console.log('👤 Please log in to Vercel (use GitHub)');
    await page.waitForURL('**/dashboard**', { timeout: 120000 });
  }
  console.log('✓ Logged into Vercel!');
  await page.screenshot({
    path: '/Users/prueba/Desktop/Projects/MaatWork/tmp/2-vercel-loggedin.png',
  });

  // ===== STEP 3: RENDER =====
  console.log('\n🔧 STEP 3: RENDER (API)');
  console.log('-'.repeat(30));
  await page.goto('https://dashboard.render.com');

  if (page.url().includes('login')) {
    console.log('👤 Please log in to Render (use GitHub)');
    await page.waitForURL('**/dashboard**', { timeout: 120000 });
  }
  console.log('✓ Logged into Render!');
  await page.screenshot({
    path: '/Users/prueba/Desktop/Projects/MaatWork/tmp/3-render-loggedin.png',
  });

  console.log('\n' + '='.repeat(50));
  console.log('ALL SERVICES LOGGED IN!');
  console.log('='.repeat(50));
  console.log('\nScreenshots saved to tmp/ directory');

  await browser.close();
})();
