import { chromium, type FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;
  const authFile = typeof storageState === 'string' ? storageState : path.join(__dirname, '.auth/user.json');
  
  // Ensure the auth directory exists
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const adminEmail = process.env.E2E_ADMIN_EMAIL || 'giolivosantarelli@gmail.com';
  const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'admin123';

  try {
    console.log(`🔐 Global Setup: Authenticating admin user (${adminEmail})...`);
    
    // Add a small delay to ensure the server is ready even after Playwright thinks it is
    await new Promise(resolve => setTimeout(resolve, 3000));

    await page.goto(baseURL + '/login', { waitUntil: 'networkidle' });
    console.log(`Current URL: ${page.url()}`);
    
    // Fill login form
    const emailInput = page.getByLabel(/email|usuario|correo/i).first();
    await emailInput.fill(adminEmail);

    const passwordInput = page.getByLabel(/contraseña|password/i).first();
    await passwordInput.fill(adminPassword);

    await page.getByRole('button', { name: /ingresar|login|entrar|iniciar sesión/i }).click();

    // Wait for the dashboard to load (sidebar is a good indicator of successful login)
    console.log('⏳ Waiting for dashboard to load...');
    await page.waitForSelector('aside, [role="navigation"], .sidebar', { timeout: 30000 });
    
    // Also wait for the URL to change from /login
    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 10000 }).catch(() => {
      console.log('Note: URL still contains /login but sidebar is visible');
    });

    console.log(`Final URL: ${page.url()}`);
    
    // Save state
    await page.context().storageState({ path: authFile });
    console.log(`✅ Global Setup: Auth state saved to ${authFile}`);
  } catch (error) {
    console.error('❌ Global Setup Failed: Could not authenticate user.');
    console.error('Common causes: DB not seeded, wrong credentials, or server not starting correctly.');
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;

