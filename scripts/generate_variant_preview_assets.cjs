#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repoRoot, 'public', 'variant-previews', 'manifest.json');
const outDir = path.join(repoRoot, 'public', 'variant-previews');
const templatePreviewDir = path.join(repoRoot, 'public', 'template-previews');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const photoPool = fs
  .readdirSync(templatePreviewDir)
  .filter((f) => f.endsWith('.webp') && f !== '_fallback.svg')
  .map((f) => path.join(templatePreviewDir, f));

if (!photoPool.length) {
  throw new Error('No template preview photos found in public/template-previews');
}

const COLORS = {
  hero: '#9D174D',
  story: '#7C3AED',
  venue: '#0369A1',
  schedule: '#0F766E',
  travel: '#1D4ED8',
  registry: '#B45309',
  faq: '#4B5563',
  rsvp: '#BE123C',
  gallery: '#7E22CE',
  countdown: '#CA8A04',
  'wedding-party': '#065F46',
  'dress-code': '#9A3412',
  accommodations: '#4338CA',
  contact: '#374151',
  'footer-cta': '#111827',
  custom: '#334155',
  quotes: '#6D28D9',
  menu: '#854D0E',
  music: '#1D4ED8',
  directions: '#0E7490',
  video: '#B91C1C',
};

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function esc(s) {
  return String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
}

function overlaySvg(sectionType, displayName) {
  const accent = COLORS[sectionType] || '#1F2937';
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540">
    <defs>
      <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.05"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.45"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="960" height="540" fill="url(#fade)"/>
    <rect x="22" y="22" width="916" height="496" rx="18" fill="none" stroke="#ffffff" stroke-opacity="0.75" stroke-width="2"/>
    <rect x="34" y="34" width="180" height="32" rx="16" fill="${accent}" fill-opacity="0.9"/>
    <text x="124" y="55" text-anchor="middle" fill="#ffffff" font-family="Inter,Arial,sans-serif" font-size="14" font-weight="700">${esc(sectionType)}</text>
    <rect x="34" y="442" width="892" height="64" rx="14" fill="#111827" fill-opacity="0.62"/>
    <text x="52" y="476" fill="#ffffff" font-family="Inter,Arial,sans-serif" font-size="22" font-weight="700">${esc(displayName)}</text>
  </svg>`);
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });

  for (const item of manifest.items) {
    const variantId = item.variantKey.split(':')[1];
    const outFile = path.join(outDir, `${item.sectionType}__${variantId}.webp`);
    const seed = hash(item.variantKey);
    const bg = photoPool[seed % photoPool.length];

    const base = sharp(bg).resize(960, 540, { fit: 'cover', position: 'attention' });

    await base
      .composite([{ input: overlaySvg(item.sectionType, item.displayName), top: 0, left: 0 }])
      .webp({ quality: 86 })
      .toFile(outFile);
  }

  console.log(`Generated ${manifest.items.length} variant preview assets in ${outDir}`);
})();
