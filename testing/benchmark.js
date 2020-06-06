// // import { default as pt } from 'puppeteer';
// const pt = require('puppeteer');

// async function main() {
//     const browser = await pt.launch({ headless: 'false' });
//     const page = await browser.newPage();
//     await page.goto('https://apple.com');
// }


// main();
//
const puppeteer = require('puppeteer');
const sessions = 15;

(async () => {
    const pages = [];
    const browsers = [];
    for (let i = 0; i < sessions; i++) {
        const browser = await puppeteer.launch({
          headless: false,
          ignoreHTTPSErrors: true
        });
        const page = await browser.newPage();
        await page.goto('https://localhost:8443');
        await page.click('#call');
        pages.push(page);
        browsers.push(browser);
    }

    await delay(3000);

    const beginPage = pages[0];
    await beginPage.click('#begin');

    await delay(10000);

    await beginPage.click('#benchmark');

    await delay(15000);

    const bench = await beginPage.evaluate(() => {
        return window.lastBench;
    });
    console.log('BENCH COMPLETE', `\n${bench} messages`, `\n${sessions} sessions`)

    for (let browser of browsers) {
        await browser.close();
    }

    require("child_process").exec("killall node");
    // process.exit(0);
})();

function delay(time) {
    return new Promise((res, rej) => {
        setTimeout(() => { res() }, time);
    });
}
