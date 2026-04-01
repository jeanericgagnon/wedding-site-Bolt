import { chromium } from 'playwright';

const url = process.argv[2] || 'https://dayof.love';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
console.log(JSON.stringify({ title: await page.title(), url: page.url() }, null, 2));
await browser.close();
