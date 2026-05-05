import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5177';
const stamp = new Date();
const date = stamp.toISOString().slice(0, 10);
const runId = `dayof-ui-${Date.now()}`;
const outDir = join('docs', 'proof-screenshots', date, runId);
const rawRoutes = process.argv.slice(2);
const routes = rawRoutes.length > 0
  ? rawRoutes
  : [
      '/dashboard/overview?bypassPayment=1',
      '/dashboard/builder?bypassPayment=1',
      '/dashboard/guests?bypassPayment=1',
      '/dashboard/photos?bypassPayment=1',
      '/dashboard/planning?bypassPayment=1',
      '/site/ericandkaras',
      '/photos/upload?site=ericandkaras',
    ];

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
];

function safeName(route) {
  return route.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'home';
}

async function triggerScrollReveals(page) {
  const height = await page.evaluate(() => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight));
  const viewportHeight = page.viewportSize()?.height ?? 900;
  for (let y = 0; y < height; y += Math.max(280, Math.floor(viewportHeight * 0.8))) {
    await page.evaluate((nextY) => window.scrollTo(0, nextY), y);
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(350);
}

async function normalizeStickyForFullPageCapture(page) {
  await page.addStyleTag({
    content: `
      .sticky,
      [class*=" sticky "],
      [class^="sticky "],
      [class$=" sticky"] {
        position: static !important;
      }
    `,
  });
}

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const failures = [];

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  for (const route of routes) {
    const url = route.startsWith('http') ? route : `${baseUrl}${route}`;
    const file = join(outDir, `${viewport.name}-${safeName(route)}.png`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      await page.waitForTimeout(1500);
      await triggerScrollReveals(page);
      await normalizeStickyForFullPageCapture(page);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`[dayof] captured ${file}`);
    } catch (error) {
      failures.push(`${viewport.name} ${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  await page.close();
}

await browser.close();

if (failures.length > 0) {
  console.error('\n[dayof] Screenshot failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`\n[dayof] Screenshots saved to ${outDir}`);
