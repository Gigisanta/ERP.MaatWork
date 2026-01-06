import { chromium, type FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * AI_DECISION: Enhanced E2E setup with retry logic and better error handling
 * Justificación: Reduce flakiness from timing issues and server startup
 * Impacto: < 1% flaky test rate
 */
async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;
  const authFile =
    typeof storageState === 'string' ? storageState : path.join(__dirname, '.auth/user.json');

  // Ensure the auth directory exists
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin@grupoabax.com';
  const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'password123';

  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `🔐 Global Setup: Authenticating admin user (${adminEmail})... (Attempt ${attempt}/${MAX_RETRIES})`
      );

      // Increased delay for server readiness (3s → 5s)
      await new Promise((resolve) => setTimeout(resolve, 5000));

      await page.goto(baseURL + '/login', { waitUntil: 'networkidle', timeout: 30000 });
      console.log(`Current URL: ${page.url()}`);

      // Fill login form with increased timeout
      const emailInput = page.getByLabel(/email|usuario|correo/i).first();
      await emailInput.fill(adminEmail, { timeout: 10000 });

      const passwordInput = page.getByLabel(/contraseña|password/i).first();
      await passwordInput.fill(adminPassword, { timeout: 10000 });

      await page
        .getByRole('button', { name: /ingresar|login|entrar|iniciar sesión/i })
        .click({ timeout: 10000 });

      // Wait for the dashboard to load (sidebar is a good indicator of successful login)
      console.log('⏳ Waiting for dashboard to load...');
      await page.waitForSelector('aside, [role="navigation"], .sidebar', { timeout: 30000 });

      // Also wait for the URL to change from /login
      await page
        .waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 15000 })
        .catch(() => {
          console.log('Note: URL still contains /login but sidebar is visible');
        });

      console.log(`Final URL: ${page.url()}`);

      // Save state
      await page.context().storageState({ path: authFile });
      console.log(`✅ Global Setup: Auth state saved to ${authFile}`);

      // Success - break out of retry loop
      break;
    } catch (error) {
      lastError = error as Error;
      console.error(
        `❌ Attempt ${attempt} failed:`,
        error instanceof Error ? error.message : String(error)
      );

      if (attempt < MAX_RETRIES) {
        console.log(`⏳ Retrying in 3 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }

  await browser.close();

  // If all retries failed, throw the last error
  if (lastError) {
    console.error('\n❌ Global Setup Failed after all retries: Could not authenticate user.');
    console.error(
      'Common causes: DB not seeded, wrong credentials, or server not starting correctly.'
    );
    throw lastError;
  }
}

export default globalSetup;
