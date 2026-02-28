const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('=== COMPLETE RENDER SETUP ===\n');

  // Step 1: Create Database
  console.log('STEP 1: Creating PostgreSQL...');
  await page.goto('https://dashboard.render.com/new/postgres');
  console.log('👤 Create a PostgreSQL with:');
  console.log('   - Name: maatwork-db');
  console.log('   - Database: maatwork');
  console.log('   - Plan: Free');
  console.log('   - Region: Oregon');
  console.log('\nPress Enter when database is created...');

  await new Promise((resolve) => process.stdin.once('data', resolve));
  await page.waitForTimeout(2000);

  // Get database connection info
  console.log('\n📋 Getting database connection info...');
  await page.goto('https://dashboard.render.com/databases');
  await page.waitForTimeout(2000);

  try {
    // Click on the database
    await page.click('text=maatwork-db');
    await page.waitForTimeout(2000);

    // Look for connection string
    const connectionInfo = await page.evaluate(() => {
      const pre = document.querySelector('pre, code');
      return pre ? pre.textContent : 'Not found';
    });
    console.log('Connection info found');
  } catch (e) {
    console.log('Could not get connection info automatically');
  }

  // Step 2: Create Web Service
  console.log('\nSTEP 2: Creating Web Service...');
  await page.goto('https://dashboard.render.com/new/blueprint');
  console.log('👤 Import from: https://github.com/Gigisanta/MaatWork');
  console.log('Press Enter when ready...');

  await new Promise((resolve) => process.stdin.once('data', resolve));

  console.log('\n=== SETUP COMPLETE ===');

  await browser.close();
})();
