#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const repoRoot = path.resolve(__dirname, '..');
const registryPath = path.join(repoRoot, 'src', 'templates', 'registry.ts');
const photoManifestPath = path.join(repoRoot, 'public', 'preview-photos', 'manifest.json');
const outDir = path.join(repoRoot, 'public', 'template-previews');

const src = fs.readFileSync(registryPath, 'utf8');
const entries = [];
const re = /\{\s*id:\s*'([^']+)'[\s\S]*?name:\s*'([^']+)'[\s\S]*?defaultThemePreset:\s*'([^']+)'[\s\S]*?sections:\s*\[([\s\S]*?)\][\s\S]*?\},\s*\},/g;
let m;
while ((m = re.exec(src))) {
  const [_, id, name, theme, sectionsBlock] = m;
  const sectionTypes = Array.from(sectionsBlock.matchAll(/type:\s*'([^']+)'/g)).map((x) => x[1]).slice(0, 8);
  entries.push({ id, name, theme, sectionTypes });
}

const manifest = JSON.parse(fs.readFileSync(photoManifestPath, 'utf8'));
const photos = manifest.items || [];
if (!photos.length) {
  throw new Error('No photos found. Run scripts/sync_preview_photos_from_kara.mjs first.');
}

const landscapeFirst = [
  ...photos.filter((p) => p.orientation === 'landscape' && p.bucket !== 'root'),
  ...photos.filter((p) => p.orientation === 'landscape' && p.bucket === 'root'),
  ...photos.filter((p) => p.orientation !== 'landscape'),
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function esc(v) {
  return String(v).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
}

function overlaySvg(tpl) {
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.48"/>
    </linearGradient>
  </defs>
  <rect width="960" height="540" fill="url(#fade)"/>
  <rect x="28" y="28" width="904" height="484" rx="16" fill="none" stroke="#ffffff" stroke-opacity="0.72" stroke-width="2"/>
  <text x="56" y="404" fill="#ffffff" font-size="36" font-weight="700" font-family="Inter,Arial,sans-serif">${esc(tpl.name)}</text>
  <text x="56" y="436" fill="#f3f4f6" font-size="16" font-family="Inter,Arial,sans-serif">${esc(tpl.theme)} theme</text>
</svg>`);
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });

  for (const tpl of entries) {
    const idx = hash(`${tpl.id}:${tpl.theme}`) % landscapeFirst.length;
    const bg = path.join(repoRoot, 'public', landscapeFirst[idx].url.replace(/^\//, ''));
    const outFile = path.join(outDir, `${tpl.id}.webp`);

    await sharp(bg)
      .resize(960, 540, { fit: 'cover', position: 'attention' })
      .composite([{ input: overlaySvg(tpl), top: 0, left: 0 }])
      .webp({ quality: 86 })
      .toFile(outFile);
  }

  console.log(`Generated ${entries.length} template preview assets in ${outDir}`);
})();
