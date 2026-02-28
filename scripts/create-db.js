const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('=== CREATING POSTGRESQL IN RENDER ===\n');

  // Go directly to create database page
  await page.goto('https://dashboard.render.com/new/postgres');

  console.log('Page loaded. Waiting for you to create the database...');
  console.log('Please configure:');
  console.log('- Name: maatwork-db');
  console.log('- Database: maatwork');
  console.log('- User: maatwork');
  console.log('- Plan: Free');
  console.log('\nWhen done, the browser will stay open for you to copy the connection string.');

  // Wait for user to create
  await page.waitForTimeout(120000);

  await browser.close();
  console.log('\nDone');
})();
