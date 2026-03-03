#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const registryPath = path.join(repoRoot, 'src', 'templates', 'registry.ts');
const outPath = path.join(repoRoot, 'public', 'template-previews', 'manifest.json');

const src = fs.readFileSync(registryPath, 'utf8');
const ids = Array.from(src.matchAll(/\bid:\s*'([^']+)'/g)).map((m) => m[1]);

const manifest = {
  generatedAt: new Date().toISOString(),
  source: 'src/templates/registry.ts',
  fallback: '/template-previews/_fallback.svg',
  count: ids.length,
  previews: ids.map((id) => ({
    id,
    src: `/template-previews/${id}.webp`,
    fallbackSrc: '/template-previews/_fallback.svg',
  })),
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${outPath} (${manifest.count} templates)`);
