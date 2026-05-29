#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { spawnSync } from 'child_process';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const manifestPath = path.join(repoRoot, 'public', 'variant-previews', 'manifest.json');
const outDir = path.join(repoRoot, 'public', 'variant-previews-gif');
const tmpDir = path.join(repoRoot, '.tmp', 'variant-gif-frames');
const baseUrl = process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4173';
const isLocalBaseUrl = /127\.0\.0\.1|localhost/i.test(baseUrl);

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

async function assertLocalBaseUrlReady(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1_500) });
    if (response.ok) return;
    throw new Error(`received HTTP ${response.status}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Variant GIF capture requires a running preview/dev server at ${url}. Start the local runtime first, then rerun this capture. (${detail})`,
    );
  }
}

function ffmpegGif(inputPattern, outputGif) {
  const res = spawnSync('ffmpeg', ['-y', '-framerate', '12', '-i', inputPattern, '-vf', 'fps=12,scale=960:540:flags=lanczos', '-loop', '0', outputGif], { stdio: 'inherit' });
  if (res.status !== 0) throw new Error('ffmpeg failed');
}

async function run() {
  if (isLocalBaseUrl) {
    await assertLocalBaseUrlReady(baseUrl);
  }

  ensureDir(outDir);
  ensureDir(tmpDir);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });

  let i = 0;
  for (const item of manifest.items) {
    i += 1;
    const variantId = item.variantKey.split(':')[1];
    const key = `${item.sectionType}__${variantId}`;
    const framesDir = path.join(tmpDir, key);
    ensureDir(framesDir);

    const url = `${baseUrl}/variant-preview-capture?sectionType=${encodeURIComponent(item.sectionType)}&variant=${encodeURIComponent(variantId)}`;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#variant-preview-root[data-variant-preview-ready="true"]', { timeout: 12000 });
      await page.waitForTimeout(500);

      for (let f = 0; f < 18; f++) {
        await page.screenshot({ path: path.join(framesDir, `frame_${String(f).padStart(3, '0')}.png`), type: 'png' });
        await page.waitForTimeout(80);
      }

      ffmpegGif(path.join(framesDir, 'frame_%03d.png'), path.join(outDir, `${key}.gif`));
      if (i % 20 === 0) console.log(`Captured ${i}/${manifest.items.length}`);
    } catch (err) {
      console.error(`Failed ${key}:`, err.message);
    }
  }

  await browser.close();
  console.log('Done variant gifs');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
