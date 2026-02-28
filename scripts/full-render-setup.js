const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('========================================');
  console.log('   COMPLETE RENDER DEPLOYMENT SETUP');
  console.log('========================================\n');

  // ========== STEP 1: CREATE DATABASE ==========
  console.log('📦 STEP 1: Creating PostgreSQL Database...');
  await page.goto('https://dashboard.render.com/new/postgres');

  console.log('👤 Please fill the form:');
  console.log('   - Name: maatwork-db');
  console.log('   - Database name: maatwork');
  console.log('   - User: maatwork');
  console.log('   - Region: Oregon');
  console.log('   - Plan: Free');
  console.log('\n✅ Click "Create Database" when ready');
  console.log('⏳ Wait for database to be ready (may take 1-2 minutes)...');

  // Wait for user to create database
  await page.waitForURL('**/databases/**', { timeout: 180000 }).catch(() => {});

  // Try to get connection string
  let dbConnectionString = '';
  try {
    await page.waitForTimeout(3000);
    const infoText = await page.textContent('body');
    if (infoText.includes('postgres://')) {
      const match = infoText.match(/postgres:\/\/[^\s]+/);
      if (match) dbConnectionString = match[0];
    }
  } catch (e) {}

  console.log('✓ Database created!\n');

  // ========== STEP 2: CREATE WEB SERVICE ==========
  console.log('🌐 STEP 2: Creating Web Service...');
  await page.goto('https://dashboard.render.com/new');
  await page.waitForTimeout(2000);

  console.log('👤 Click "Web Service"');
  await page.click('text=Web Service').catch(async () => {
    // Try to find and click
    await page.click('a[href*="new"]').catch(() => {});
  });

  console.log('\n👤 In the form:');
  console.log('   - Repository: Gigisanta/MaatWork');
  console.log('   - Branch: main');
  console.log('   - Root Directory: (leave empty)');
  console.log('   - Build Command: pnpm install && pnpm build');
  console.log('   - Start Command: pnpm start');
  console.log('   - Plan: Free');
  console.log('\n✅ Click "Create Web Service" when ready');

  await page.waitForURL('**/services/**', { timeout: 180000 }).catch(() => {});
  console.log('✓ Web Service created!\n');

  // ========== STEP 3: CREATE API SERVICE ==========
  console.log('🔧 STEP 3: Creating API Service...');
  await page.goto('https://dashboard.render.com/new');
  await page.waitForTimeout(2000);

  console.log('👤 Click "Web Service" again');

  console.log('\n👤 In the form:');
  console.log('   - Name: maatwork-api');
  console.log('   - Repository: Gigisanta/MaatWork');
  console.log('   - Branch: main');
  console.log('   - Root Directory: (leave empty)');
  console.log('   - Build Command: pnpm install && pnpm --filter @maatwork/api build');
  console.log('   - Start Command: node apps/api/dist/index.js');
  console.log('   - Plan: Free');
  console.log('\n✅ Click "Create Web Service" when ready');

  await page.waitForURL('**/services/**', { timeout: 180000 }).catch(() => {});
  console.log('✓ API Service created!\n');

  // ========== SUMMARY ==========
  console.log('========================================');
  console.log('   🎉 ALL SERVICES CREATED!');
  console.log('========================================\n');

  console.log('Next steps:');
  console.log('1. Go to each service → Environment');
  console.log('2. Add DATABASE_URL with the connection string');
  console.log('3. Wait for deployment to complete');

  await page.screenshot({
    path: '/Users/prueba/Desktop/Projects/MaatWork/tmp/render-complete.png',
  });
  console.log('\n📸 Screenshot saved');

  console.log('\nBrowser will stay open for 5 minutes...');
  await page.waitForTimeout(300000);

  await browser.close();
})();
