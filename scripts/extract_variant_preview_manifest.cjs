#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const manifestsPath = path.join(repoRoot, 'src', 'builder', 'registry', 'sectionManifests.ts');
const outPath = path.join(repoRoot, 'public', 'variant-previews', 'manifest.json');

const src = fs.readFileSync(manifestsPath, 'utf8');

function extractSections(input) {
  const sections = [];
  const sectionRegex = /(\n|^)\s*([\w'-]+):\s*\{[\s\S]*?type:\s*'([^']+)'[\s\S]*?variantMeta:\s*\[([\s\S]*?)\][\s\S]*?\n\s*\},/g;
  let match;
  while ((match = sectionRegex.exec(input))) {
    const sectionType = match[3];
    const variantBlock = match[4];
    const variants = Array.from(variantBlock.matchAll(/\{\s*id:\s*'([^']+)'\s*,\s*label:\s*'([^']+)'/g)).map((m) => ({
      variantKey: m[1],
      displayName: m[2],
    }));
    if (!variants.length) continue;
    sections.push({ sectionType, variants });
  }
  return sections;
}

const sections = extractSections(src);
const rows = sections.flatMap(({ sectionType, variants }) =>
  variants.map((v) => ({
    sectionType,
    variantKey: `${sectionType}:${v.variantKey}`,
    displayName: v.displayName,
  }))
);

const manifest = {
  generatedAt: new Date().toISOString(),
  source: 'src/builder/registry/sectionManifests.ts',
  count: rows.length,
  items: rows,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Wrote ${outPath} (${manifest.count} variants)`);
