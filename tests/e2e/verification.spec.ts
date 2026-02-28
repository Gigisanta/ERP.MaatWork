import { test, expect } from '@playwright/test';

test.describe('Definitive Session Diagnostic', () => {
  test('should capture and log all session state', async ({ page, context }) => {
    const baseURL = 'https://maatwork-web-production.up.railway.app';
    console.log(`🚀 STARTING DEFINITIVE DIAGNOSTIC at: ${baseURL}`);

    // Log all network requests
    page.on('request', request => console.log(`   >> [REQ] ${request.method()} ${request.url()}`));
    page.on('response', async response => {
    if (response.url().includes('/auth/login')) {
      console.log(`📡 [RES] ${response.status()} ${response.url()}`);
      console.log(`📋 Headers: ${JSON.stringify(response.headers(), null, 2)}`);
      const setCookie = response.headers()['set-cookie'];
      if (setCookie) {
        console.log(`🍪 SET-COOKIE FOUND: ${setCookie}`);
      } else {
        console.log('⚠️ NO SET-COOKIE HEADER IN LOGIN RESPONSE');
      }
    }
    if (response.status() >= 400) {
      console.log(`<< [RES] ${response.status()} ${response.url()}`);
    }
  });

    await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
    
    // Log initial cookies
    const initialCookies = await context.cookies();
    console.log(`🍪 Initial cookies count: ${initialCookies.length}`);

    const adminEmail = 'admin@grupoabax.com';
    const adminPassword = 'password123';

    // Robust selector check
    console.log('🔍 Locating login fields...');
    const emailField = page.locator('input').filter({ hasText: "" }).or(page.locator('input[type="email"]')).or(page.locator('input[name="email"]')).first();
    const passwordField = page.locator('input[type="password"]').or(page.locator('input[name="password"]')).first();
    
    await emailField.fill(adminEmail);
    await passwordField.fill(adminPassword);
    
    const loginButton = page.locator('button').filter({ hasText: /ingresar|login|entrar|iniciar sesión/i }).first();
    
    console.log('🔘 Clicking login...');
    await loginButton.click();

    // Wait for either success or failure
    await Promise.any([
      page.waitForResponse(r => r.url().includes('/auth/login') && r.status() === 200, { timeout: 20000 }),
      page.waitForSelector('text=inválido|error|incorrecto', { timeout: 20000 }).then(() => { throw new Error('Login rejected by server'); })
    ]);

    console.log('📡 Authentication API call successful.');
    await page.waitForTimeout(5000); // Wait for potential redirects

    const postLoginCookies = await context.cookies();
    console.log(`🍪 Post-login cookies count: ${postLoginCookies.length}`);
    postLoginCookies.forEach(c => {
      console.log(`   [COOKIE] ${c.name} | Domain: ${c.domain} | Secure: ${c.secure} | SameSite: ${c.sameSite}`);
    });

    console.log(`📍 Final URL: ${page.url()}`);
    await page.screenshot({ path: 'production_definitive_diagnostic.png', fullPage: true });

    if (page.url().includes('login')) {
      console.log('❌ REDIRECTED back to login. Investigating session/CORS.');
    } else {
      console.log('✅ REACHED DASHBOARD candidate.');
    }
  });
});
