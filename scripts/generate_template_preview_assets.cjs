#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const repoRoot = path.resolve(__dirname, '..');
const registryPath = path.join(repoRoot, 'src', 'templates', 'registry.ts');
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

const themeColors = {
  editorial: ['#111827', '#6b7280'],
  moody: ['#1f2937', '#374151'],
  romantic: ['#fbcfe8', '#f9a8d4'],
  playful: ['#f59e0b', '#fb7185'],
  classic: ['#e5e7eb', '#9ca3af'],
  coastal: ['#93c5fd', '#67e8f9'],
  garden: ['#86efac', '#4ade80'],
  minimal: ['#f5f5f4', '#d6d3d1'],
  luxury: ['#111827', '#f59e0b'],
  destination: ['#7dd3fc', '#a7f3d0'],
  photography: ['#d1d5db', '#9ca3af'],
  rustic: ['#fdba74', '#f59e0b'],
  boho: ['#fed7aa', '#fdba74'],
};

function escapeXml(v) {
  return v.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
}

function svgForTemplate(tpl) {
  const [c1, c2] = themeColors[tpl.theme] || ['#e5e7eb', '#9ca3af'];
  const chips = tpl.sectionTypes.slice(0, 6);
  const chipSvg = chips
    .map((s, i) => {
      const x = 84 + (i % 3) * 420;
      const y = 380 + Math.floor(i / 3) * 92;
      return `<rect x="${x}" y="${y}" width="350" height="58" rx="14" fill="#ffffff" fill-opacity="0.72"/><text x="${x + 20}" y="${y + 37}" fill="#111827" font-size="28" font-family="Inter,Arial,sans-serif">${escapeXml(s)}</text>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 900">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="1440" height="900" fill="url(#g)"/>
  <rect x="64" y="64" width="1312" height="772" rx="28" fill="#ffffff" fill-opacity="0.16"/>
  <text x="96" y="164" fill="#ffffff" font-size="44" font-weight="700" font-family="Inter,Arial,sans-serif">${escapeXml(tpl.name)}</text>
  <text x="96" y="214" fill="#f3f4f6" font-size="28" font-family="Inter,Arial,sans-serif">Theme: ${escapeXml(tpl.theme)} · ${tpl.sectionTypes.length} sections</text>
  ${chipSvg}
  <text x="96" y="790" fill="#f3f4f6" font-size="24" font-family="Inter,Arial,sans-serif">${escapeXml(tpl.id)}</text>
</svg>`;
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  for (const tpl of entries) {
    const svg = svgForTemplate(tpl);
    const outFile = path.join(outDir, `${tpl.id}.webp`);
    await sharp(Buffer.from(svg)).webp({ quality: 82 }).toFile(outFile);
  }
  console.log(`Generated ${entries.length} preview assets in ${outDir}`);
})();
