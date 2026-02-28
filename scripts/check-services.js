const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Check multiple services
  const services = [
    { name: 'Neon', url: 'https://console.neon.tech' },
    { name: 'Vercel', url: 'https://vercel.com/dashboard' },
    { name: 'Render', url: 'https://dashboard.render.com' },
    { name: 'GitHub', url: 'https://github.com/settings/tokens' },
  ];

  for (const service of services) {
    await page.goto(service.url);
    await page.waitForTimeout(2000);
    console.log(
      `${service.name}: ${page.url().substring(0, 50)}... [${await page.title().then((t) => t.substring(0, 30))}]`
    );
  }

  await browser.close();
  console.log('\nDone checking services');
})();
