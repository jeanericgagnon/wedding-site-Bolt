#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const manifestPath = path.join(repoRoot, 'public', 'variant-previews', 'manifest.json');
const outDir = path.join(repoRoot, 'public', 'variant-previews');
const baseUrl = process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4173';

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

async function run() {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });

  for (const [idx, item] of manifest.items.entries()) {
    const variantId = item.variantKey.split(':')[1];
    const outPath = path.join(outDir, `${item.sectionType}__${variantId}.webp`);
    const tmpPngPath = path.join(outDir, `.__tmp_${item.sectionType}__${variantId}.png`);
    const url = `${baseUrl}/variant-preview-capture?sectionType=${encodeURIComponent(item.sectionType)}&variant=${encodeURIComponent(variantId)}`;

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#variant-preview-root[data-variant-preview-ready="true"]', { timeout: 10000 });
    await page.waitForTimeout(350);
    await page.locator('#variant-preview-root').screenshot({ path: tmpPngPath, type: 'png' });
    await sharp(tmpPngPath).webp({ quality: 88 }).toFile(outPath);
    fs.unlinkSync(tmpPngPath);
    if ((idx + 1) % 20 === 0) console.log(`Captured ${idx + 1}/${manifest.items.length}`);
  }

  await browser.close();
  console.log(`Captured ${manifest.items.length} variant screenshots to ${outDir}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
