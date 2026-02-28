const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('=== CREAR BASE DE DATOS EN RENDER ===\n');

  // Navigate to Render dashboard
  await page.goto('https://dashboard.render.com');

  console.log('👤 Por favor:');
  console.log('1. Inicia sesión en Render si no lo has hecho');
  console.log('2. Ve a: https://dashboard.render.com');
  console.log('3. Click en "New" → "PostgreSQL"');
  console.log('4. Configura:');
  console.log('   - Name: maatwork-db');
  console.log('   - Database: maatwork');
  console.log('   - User: maatwork');
  console.log('   - Plan: Free');
  console.log('5. Click "Create Database"');
  console.log('\nCuando termines, dime y continuamos.');

  // Keep browser open
  await page.waitForTimeout(300000);

  await browser.close();
})();
