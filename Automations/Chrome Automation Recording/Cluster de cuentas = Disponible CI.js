const puppeteer = require('puppeteer'); // v23.0.0 or later

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const timeout = 5000;
    page.setDefaultTimeout(timeout);

    {
        const targetPage = page;
        await targetPage.setViewport({
            width: 1350,
            height: 945
        })
    }
    {
        const targetPage = page;
        await targetPage.goto('https://productores.balanz.com/ReporteClusterCuentas');
    }
    {
        const targetPage = page;
        await puppeteer.Locator.race([
            targetPage.locator('section > div > div > div:nth-of-type(2) > div:nth-of-type(1) span.sui-caret-container'),
            targetPage.locator('::-p-xpath(//*[@id=\\"wrapper\\"]/section/div/div/div[2]/div[1]/div/div/div/span/span[2])'),
            targetPage.locator(':scope >>> section > div > div > div:nth-of-type(2) > div:nth-of-type(1) span.sui-caret-container')
        ])
            .setTimeout(timeout)
            .click({
              offset: {
                x: 17.796875,
                y: 16.078125,
              },
            });
    }
    {
        const targetPage = page;
        await puppeteer.Locator.race([
            targetPage.locator('span:nth-of-type(1) li:nth-of-type(2)'),
            targetPage.locator('::-p-xpath(/html/body/span[1]/ul/li[2])'),
            targetPage.locator(':scope >>> span:nth-of-type(1) li:nth-of-type(2)')
        ])
            .setTimeout(timeout)
            .click({
              offset: {
                x: 452.5,
                y: 17.078125,
              },
            });
    }
    {
        const targetPage = page;
        await puppeteer.Locator.race([
            targetPage.locator('div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(1) span > span > span'),
            targetPage.locator('::-p-xpath(//*[@id=\\"wrapper\\"]/section/div/div/div[6]/div[2]/div[1]/div/div/span/span/span)'),
            targetPage.locator(':scope >>> div:nth-of-type(6) > div:nth-of-type(2) > div:nth-of-type(1) span > span > span')
        ])
            .setTimeout(timeout)
            .click({
              offset: {
                x: 0.5,
                y: 2.984375,
              },
            });
    }
    {
        const targetPage = page;
        await puppeteer.Locator.race([
            targetPage.locator('div:nth-of-type(6) div:nth-of-type(4) label'),
            targetPage.locator('::-p-xpath(//*[@id=\\"wrapper\\"]/section/div/div/div[6]/div[2]/div[4]/div/div/span/label)'),
            targetPage.locator(':scope >>> div:nth-of-type(6) div:nth-of-type(4) label'),
            targetPage.locator('::-p-text(MEP Disponibles CI)')
        ])
            .setTimeout(timeout)
            .click({
              offset: {
                x: 1.3125,
                y: 0.796875,
              },
            });
    }
    {
        const targetPage = page;
        await puppeteer.Locator.race([
            targetPage.locator('::-p-aria(DESCARGAR)'),
            targetPage.locator('section a'),
            targetPage.locator('::-p-xpath(//*[@id=\\"wrapper\\"]/section/div/div/div[12]/div/a)'),
            targetPage.locator(':scope >>> section a'),
            targetPage.locator('::-p-text(Descargar)')
        ])
            .setTimeout(timeout)
            .click({
              offset: {
                x: 119.859375,
                y: 18.59375,
              },
            });
    }

    await browser.close();

})().catch(err => {
    console.error(err);
    process.exit(1);
});
