#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const repoRoot = path.resolve(__dirname, '..');
const templatePacksPath = path.join(repoRoot, 'src', 'builder', 'constants', 'builderTemplatePacks.ts');
const legacyRegistryPath = path.join(repoRoot, 'src', 'templates', 'registry.ts');
const photoManifestPath = path.join(repoRoot, 'public', 'preview-photos', 'manifest.json');
const outDir = path.join(repoRoot, 'public', 'template-previews');

const builderSrc = fs.readFileSync(templatePacksPath, 'utf8');
const legacySrc = fs.readFileSync(legacyRegistryPath, 'utf8');

const nameById = new Map();
for (const m of builderSrc.matchAll(/id:\s*'([^']+)'[\s\S]*?displayName:\s*'([^']+)'/g)) {
  nameById.set(m[1], m[2]);
}
for (const m of legacySrc.matchAll(/id:\s*'([^']+)'[\s\S]*?name:\s*'([^']+)'/g)) {
  if (!nameById.has(m[1])) nameById.set(m[1], m[2]);
}

const allIds = Array.from(new Set([...nameById.keys()]));
const entries = allIds.map((id) => ({ id, name: nameById.get(id) || id }));

const manifest = JSON.parse(fs.readFileSync(photoManifestPath, 'utf8'));
const photos = manifest.items || [];
if (!photos.length) {
  throw new Error('No photos found. Run scripts/sync_preview_photos_from_kara.mjs first.');
}

const GLOBAL_HEADER_PHOTO = path.join(repoRoot, 'public', 'preview-photos', 'header-anchor.jpg');
if (!fs.existsSync(GLOBAL_HEADER_PHOTO)) {
  throw new Error('Missing global header photo at public/preview-photos/header-anchor.jpg');
}

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
  <text x="56" y="392" fill="#ffffff" font-size="34" font-weight="700" font-family="Inter,Arial,sans-serif">Kara &amp; Eric</text>
  <text x="56" y="420" fill="#f3f4f6" font-size="16" font-family="Inter,Arial,sans-serif">January 17, 2027 · Napa Valley</text>
  <text x="56" y="446" fill="#f3f4f6" font-size="14" font-family="Inter,Arial,sans-serif">${esc(tpl.name)}</text>
</svg>`);
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });

  const positions = ['attention', 'centre', 'north', 'south', 'east', 'west'];
  for (const tpl of entries) {
    const bg = GLOBAL_HEADER_PHOTO;
    const outFile = path.join(outDir, `${tpl.id}.webp`);
    const pos = positions[hash(tpl.id) % positions.length];

    await sharp(bg)
      .resize(960, 540, { fit: 'cover', position: pos })
      .composite([{ input: overlaySvg(tpl), top: 0, left: 0 }])
      .webp({ quality: 86 })
      .toFile(outFile);
  }

  console.log(`Generated ${entries.length} template preview assets in ${outDir}`);
})();
