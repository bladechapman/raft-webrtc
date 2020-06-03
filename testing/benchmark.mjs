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

(async () => {
  const browser = await puppeteer.launch({
      headless: false,
      ignoreHTTPSErrors: true
  });
  const page = await browser.newPage();
  await page.goto('https://localhost:8443');
  await browser.close();
})();
