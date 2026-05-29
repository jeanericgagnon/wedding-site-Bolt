#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { spawnSync } from 'child_process';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const registryPath = path.join(repoRoot, 'src', 'templates', 'registry.ts');
const outDir = path.join(repoRoot, 'public', 'template-previews-gif');
const tmpDir = path.join(repoRoot, '.tmp', 'template-gif-frames');
const baseUrl = process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4173';
const isLocalBaseUrl = /127\.0\.0\.1|localhost/i.test(baseUrl);

const registrySrc = fs.readFileSync(registryPath, 'utf8');
const templateIds = Array.from(new Set([...registrySrc.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1])));

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function assertLocalBaseUrlReady(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1_500) });
    if (response.ok) return;
    throw new Error(`received HTTP ${response.status}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Template scroll GIF capture requires a running preview/dev server at ${url}. Start the local runtime first, then rerun this capture. (${detail})`,
    );
  }
}

function runFfmpeg(inputPattern, outputGif) {
  const args = [
    '-y',
    '-framerate', '12',
    '-i', inputPattern,
    '-vf', 'fps=12,scale=960:-1:flags=lanczos',
    '-loop', '0',
    outputGif,
  ];
  const res = spawnSync('ffmpeg', args, { stdio: 'inherit' });
  if (res.status !== 0) throw new Error(`ffmpeg failed for ${outputGif}`);
}

async function captureTemplate(page, templateId) {
  const framesDir = path.join(tmpDir, templateId);
  ensureDir(framesDir);

  const url = `${baseUrl}/template-scroll-capture?templateId=${encodeURIComponent(templateId)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#template-scroll-root[data-template-scroll-ready="true"]', { timeout: 15000 });
  await page.waitForTimeout(800);

  const maxScroll = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
  const frameCount = 42;

  for (let i = 0; i < frameCount; i++) {
    const y = Math.round((maxScroll * i) / (frameCount - 1));
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    await page.waitForTimeout(90);
    await page.screenshot({ path: path.join(framesDir, `frame_${String(i).padStart(3, '0')}.png`), type: 'png' });
  }

  const gifPath = path.join(outDir, `${templateId}.gif`);
  runFfmpeg(path.join(framesDir, 'frame_%03d.png'), gifPath);
}

async function run() {
  if (isLocalBaseUrl) {
    await assertLocalBaseUrlReady(baseUrl);
  }

  ensureDir(outDir);
  ensureDir(tmpDir);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });

  let done = 0;
  for (const id of templateIds) {
    try {
      await captureTemplate(page, id);
      done += 1;
      console.log(`Captured GIF ${done}/${templateIds.length}: ${id}`);
    } catch (err) {
      console.error(`Failed ${id}:`, err.message);
    }
  }

  await browser.close();

  const manifest = {
    generatedAt: new Date().toISOString(),
    count: fs.readdirSync(outDir).filter((f) => f.endsWith('.gif')).length,
    items: fs.readdirSync(outDir).filter((f) => f.endsWith('.gif')).sort(),
  };
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Done. GIFs in ${outDir}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
