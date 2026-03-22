#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const manifestsPath = path.join(repoRoot, 'src', 'builder', 'registry', 'sectionManifests.ts');
const registryPath = path.join(repoRoot, 'src', 'sections', 'registry.ts');
const outPath = path.join(repoRoot, 'public', 'variant-previews', 'manifest.json');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function extractBuilderVariantMeta(input) {
  const bySection = new Map();
  const sectionRegex = /(\n|^)\s*([\w'-]+):\s*\{[\s\S]*?type:\s*'([^']+)'[\s\S]*?variantMeta:\s*\[([\s\S]*?)\][\s\S]*?\n\s*\},/g;
  let match;
  while ((match = sectionRegex.exec(input))) {
    const sectionType = match[3];
    const variantBlock = match[4];
    const variants = Array.from(
      variantBlock.matchAll(/\{\s*id:\s*'([^']+)'\s*,\s*label:\s*'([^']+)'/g)
    ).map((m) => ({ id: m[1], label: m[2] }));
    bySection.set(sectionType, variants);
  }
  return bySection;
}

function extractRegisteredVariantDefs(registrySrc) {
  const importPathBySymbol = new Map();
  for (const m of registrySrc.matchAll(/import\s+\{\s*(\w+)\s*\}\s+from\s+'(\.\/variants\/[^']+)'\s*;/g)) {
    importPathBySymbol.set(m[1], m[2]);
  }

  const registeredSymbols = Array.from(registrySrc.matchAll(/registerDefinition\((\w+)\)\s*;/g)).map((m) => m[1]);

  const defs = [];
  for (const symbol of registeredSymbols) {
    const rel = importPathBySymbol.get(symbol);
    if (!rel) continue;

    const absTsx = path.join(repoRoot, 'src', 'sections', `${rel.replace(/^\.\//, '')}.tsx`);
    const absTs = path.join(repoRoot, 'src', 'sections', `${rel.replace(/^\.\//, '')}.ts`);
    const abs = fs.existsSync(absTsx) ? absTsx : absTs;
    if (!fs.existsSync(abs)) continue;

    const src = read(abs);
    const defBlock = src.match(new RegExp(`export\\s+const\\s+${symbol}\\s*:[\\s\\S]*?=\\s*\\{([\\s\\S]*?)\\}\\s*;`));
    const search = defBlock ? defBlock[1] : src;
    const typeMatch = search.match(/\btype:\s*'([^']+)'/);
    const variantMatch = search.match(/\bvariant:\s*'([^']+)'/);
    if (!typeMatch || !variantMatch) continue;

    defs.push({ type: typeMatch[1], variant: variantMatch[1] });
  }

  return defs;
}

function titleCaseVariant(id) {
  return id
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const builderMeta = extractBuilderVariantMeta(read(manifestsPath));
const strictDefs = extractRegisteredVariantDefs(read(registryPath));

const toBuilderType = {
  footerCta: 'footer-cta',
  weddingParty: 'wedding-party',
  dressCode: 'dress-code',
};

const rows = strictDefs
  .map(({ type, variant }) => {
    const sectionType = toBuilderType[type] ?? type;
    const known = builderMeta.get(sectionType) || [];
    const label = known.find((v) => v.id === variant)?.label || titleCaseVariant(variant);
    return {
      sectionType,
      variantKey: `${sectionType}:${variant}`,
      displayName: label,
    };
  })
  .sort((a, b) => a.variantKey.localeCompare(b.variantKey));

const manifest = {
  generatedAt: new Date().toISOString(),
  source: 'src/sections/registry.ts (registered strict variants)',
  count: rows.length,
  items: rows,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Wrote ${outPath} (${manifest.count} variants)`);
