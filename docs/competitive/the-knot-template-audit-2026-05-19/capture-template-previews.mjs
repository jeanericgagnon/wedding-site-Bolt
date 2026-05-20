import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('docs/competitive/the-knot-template-audit-2026-05-19');
const linksPath = path.join(root, 'theknot-template-preview-links.json');
const manifestPath = path.join(root, 'theknot-template-preview-screenshot-manifest.json');
const errorsPath = path.join(root, 'theknot-template-preview-screenshot-errors.json');
const outDir = path.join(root, 'template-preview-screenshots');

const startIndex = Number.parseInt(process.argv[2] ?? '1', 10);
const limit = Number.parseInt(process.argv[3] ?? '25', 10);
const force = process.argv.includes('--force');
const concurrencyArg = process.argv.find((arg) => arg.startsWith('--concurrency='));
const concurrency = Math.max(
  1,
  Number.parseInt(concurrencyArg?.split('=')[1] ?? process.env.TEMPLATE_CAPTURE_CONCURRENCY ?? '4', 10),
);

const slugify = (value) => String(value)
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 80);

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

const links = await readJson(linksPath, []);
const manifest = await readJson(manifestPath, []);
const byId = new Map(manifest.map((item) => [String(item.id), item]));
const errors = await readJson(errorsPath, []);
const errorsById = new Map(errors.map((item) => [String(item.id), item]));
const targets = links
  .filter((item) => item.index >= startIndex)
  .slice(0, limit);

await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
let captured = 0;
let skipped = 0;
let failed = 0;
let cursor = 0;
let writeQueue = Promise.resolve();

async function writeState() {
  writeQueue = writeQueue.then(async () => {
    await fs.writeFile(
      manifestPath,
      JSON.stringify([...byId.values()].sort((a, b) => a.index - b.index), null, 2),
    );
    await fs.writeFile(
      errorsPath,
      JSON.stringify([...errorsById.values()].sort((a, b) => a.index - b.index), null, 2),
    );
  });
  return writeQueue;
}

function nextTarget() {
  const item = targets[cursor];
  cursor += 1;
  return item;
}

async function captureItem(page, item, workerId) {
  const filename = `${String(item.index).padStart(3, '0')}-${item.id}-${slugify(item.name)}.png`;
  const screenshot = path.join(outDir, filename);
  const existing = byId.get(String(item.id));
  if (!force && existing?.screenshot && await fileExists(existing.screenshot)) {
    skipped += 1;
    process.stdout.write(`worker ${workerId} skip ${item.index}/${links.length} ${item.name}\n`);
    return;
  }

  process.stdout.write(`worker ${workerId} capture ${item.index}/${links.length} ${item.name}\n`);

  try {
    await page.goto(item.href, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.getByRole('button', { name: /Reject All/i }).click({ timeout: 2_000 }).catch(() => {});
    await page.locator('img[alt^="Previewing design"]').first().waitFor({ state: 'visible', timeout: 15_000 });
    await page.waitForFunction(() => {
      const img = document.querySelector('img[alt^="Previewing design"]');
      return img && img.complete && img.naturalWidth > 0;
    }, undefined, { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(1_800);
    await page.screenshot({
      path: screenshot,
      clip: { x: 80, y: 120, width: 680, height: 560 },
    });

    byId.set(String(item.id), {
      index: item.index,
      id: item.id,
      name: item.name,
      href: item.href,
      screenshot: path.resolve(screenshot),
      captureMode: 'cropped-template-preview',
      capturedAt: new Date().toISOString(),
    });
    errorsById.delete(String(item.id));
    captured += 1;
  } catch (error) {
    failed += 1;
    errorsById.set(String(item.id), {
      index: item.index,
      id: item.id,
      name: item.name,
      href: item.href,
      error: error instanceof Error ? error.message : String(error),
      failedAt: new Date().toISOString(),
    });
    process.stdout.write(`worker ${workerId} failed ${item.index}/${links.length} ${item.name}\n`);
  }

  await writeState();
}

async function runWorker(workerId) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  try {
    for (let item = nextTarget(); item; item = nextTarget()) {
      await captureItem(page, item, workerId);
    }
  } finally {
    await page.close().catch(() => {});
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, (_, index) => runWorker(index + 1)));
await writeQueue;
await browser.close();
process.stdout.write(`done targets ${targets.length}; captured ${captured}; skipped ${skipped}; failed ${failed}; manifest ${byId.size}; concurrency ${concurrency}\n`);
