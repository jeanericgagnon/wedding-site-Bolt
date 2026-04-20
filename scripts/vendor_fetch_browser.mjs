import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const [, , targetUrl, outPath] = process.argv;
if (!targetUrl || !outPath) {
  console.error('Usage: node vendor_fetch_browser.mjs <url> <outPath>');
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  viewport: { width: 1440, height: 1200 },
});

try {
  const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2500);
  const html = await page.content();
  const finalUrl = page.url();
  const status = response?.status() ?? null;
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify({ url: targetUrl, finalUrl, status, html }));
  console.log(JSON.stringify({ url: targetUrl, finalUrl, status, outPath }));
} finally {
  await page.close().catch(() => {});
  await browser.close().catch(() => {});
}
