const puppeteer = require('puppeteer'); // v23.0.0 or later

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const timeout = 5000;
    page.setDefaultTimeout(timeout);

    {
        const targetPage = page;
        await targetPage.setViewport({
            width: 1365,
            height: 945
        })
    }
    {
        const targetPage = page;
        await targetPage.goto('https://productores.balanz.com/');
    }
    {
        const targetPage = page;
        await puppeteer.Locator.race([
            targetPage.locator('::-p-aria(Ingrese su nombre de Usuario)'),
            targetPage.locator('div.div-username > input'),
            targetPage.locator('::-p-xpath(//*[@id=\\"loginform\\"]/div[1]/input)'),
            targetPage.locator(':scope >>> div.div-username > input')
        ])
            .setTimeout(timeout)
            .click({
              offset: {
                x: 181.421875,
                y: 10,
              },
            });
    }
    {
        const targetPage = page;
        await puppeteer.Locator.race([
            targetPage.locator('::-p-aria(Ingrese su nombre de Usuario)'),
            targetPage.locator('div.div-username > input'),
            targetPage.locator('::-p-xpath(//*[@id=\\"loginform\\"]/div[1]/input)'),
            targetPage.locator(':scope >>> div.div-username > input')
        ])
            .setTimeout(timeout)
            .fill('Matevicente');
    }
    {
        const targetPage = page;
        await puppeteer.Locator.race([
            targetPage.locator('::-p-aria(INGRESAR)'),
            targetPage.locator('#loginform > div:nth-of-type(3) a'),
            targetPage.locator('::-p-xpath(//*[@id=\\"btn-login\\"])'),
            targetPage.locator(':scope >>> #loginform > div:nth-of-type(3) a'),
            targetPage.locator('::-p-text(Ingresar)')
        ])
            .setTimeout(timeout)
            .click({
              offset: {
                x: 141.296875,
                y: 17,
              },
            });
    }
    {
        const targetPage = page;
        await puppeteer.Locator.race([
            targetPage.locator('::-p-aria(Ingrese su Clave)'),
            targetPage.locator('#login-password'),
            targetPage.locator('::-p-xpath(//*[@id=\\"login-password\\"])'),
            targetPage.locator(':scope >>> #login-password'),
            targetPage.locator('::-p-text(CactusB25!)')
        ])
            .setTimeout(timeout)
            .click({
              offset: {
                x: 320.421875,
                y: 29,
              },
            });
    }
    {
        const targetPage = page;
        await puppeteer.Locator.race([
            targetPage.locator('::-p-aria(Ingrese su Clave)'),
            targetPage.locator('#login-password'),
            targetPage.locator('::-p-xpath(//*[@id=\\"login-password\\"])'),
            targetPage.locator(':scope >>> #login-password'),
            targetPage.locator('::-p-text(CactusB25!)')
        ])
            .setTimeout(timeout)
            .fill('CactusB25!');
    }
    {
        const targetPage = page;
        await puppeteer.Locator.race([
            targetPage.locator('::-p-aria(INGRESAR)'),
            targetPage.locator('#loginform > div:nth-of-type(3) a'),
            targetPage.locator('::-p-xpath(//*[@id=\\"btn-login\\"])'),
            targetPage.locator(':scope >>> #loginform > div:nth-of-type(3) a'),
            targetPage.locator('::-p-text(Ingresar)')
        ])
            .setTimeout(timeout)
            .click({
              offset: {
                x: 137.296875,
                y: 11,
              },
            });
    }

    await browser.close();

})().catch(err => {
    console.error(err);
    process.exit(1);
});
