#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const registryPage = readFileSync(resolve(process.cwd(), 'src/pages/dashboard/Registry.tsx'), 'utf8');
const registryTypes = readFileSync(resolve(process.cwd(), 'src/pages/dashboard/registry/registryTypes.ts'), 'utf8');
const repairState = readFileSync(resolve(process.cwd(), 'src/pages/dashboard/registry/repairState.ts'), 'utf8');
const duplicateRegistryItems = readFileSync(resolve(process.cwd(), 'src/pages/dashboard/registry/duplicateRegistryItems.ts'), 'utf8');
const registryItemCard = readFileSync(resolve(process.cwd(), 'src/pages/dashboard/registry/RegistryItemCard.tsx'), 'utf8');
const registryItemForm = readFileSync(resolve(process.cwd(), 'src/pages/dashboard/registry/RegistryItemForm.tsx'), 'utf8');
const sectionRegistry = readFileSync(resolve(process.cwd(), 'src/sections/registry.ts'), 'utf8');
const canonicalSectionRegistry = readFileSync(resolve(process.cwd(), 'src/lib/canonicalSectionRegistry.ts'), 'utf8');
const registryCardsSection = readFileSync(resolve(process.cwd(), 'src/sections/variants/registry/cards.tsx'), 'utf8');
const registryFeaturedSection = readFileSync(resolve(process.cwd(), 'src/sections/variants/registry/featured.tsx'), 'utf8');

const checks = [
  { name: 'dashboard uses sanitizeRegistryQuantityState', ok: registryPage.includes('sanitizeRegistryQuantityState') },
  { name: 'dashboard loads duplicate registry groups', ok: registryPage.includes('findDuplicateRegistryGroups') },
  { name: 'dashboard demo creates preserve canonical registry metadata', ok: registryPage.includes('canonical_url: fields.canonical_url ?? null') && registryPage.includes('metadata_fetch_status: fields.metadata_fetch_status ?? \'manual\'') },
  { name: 'dashboard repair queue includes unavailable registry imports', ok: registryPage.includes('product unavailable') },
  { name: 'dashboard refresh syncs merchant into store_name', ok: registryPage.includes('fields.store_name = (preview.merchant ?? preview.brand)!;') },
  { name: 'dashboard auto-refresh syncs merchant into store_name', ok: registryPage.includes('if (preview.merchant ?? preview.brand) {\n          fields.merchant = (preview.merchant ?? preview.brand)!;\n          fields.store_name = (preview.merchant ?? preview.brand)!;\n        }') },
  { name: 'section registry keeps strict alias fallbacks for template-backed registry variants', ok: sectionRegistry.includes('const def = strictVariant') && sectionRegistry.includes('VARIANT_FALLBACKS[type]?.[variant] ? getDefinition(normalizedType, VARIANT_FALLBACKS[type][variant]) : null') },
  { name: 'canonical registry validation accepts template-backed registry aliases', ok: canonicalSectionRegistry.includes("luxury: 'featured'") && canonicalSectionRegistry.includes("experiences: 'featured'") && canonicalSectionRegistry.includes("classic: 'cards'") },
  { name: 'public registry cards keep canonical-only store links usable', ok: registryCardsSection.includes("return item.item_url ?? item.canonical_url ?? null;") && registryCardsSection.includes('url: existing.url ?? publicUrl') },
  { name: 'public registry featured links derive live store urls from canonical items', ok: registryFeaturedSection.includes("return item.item_url ?? item.canonical_url ?? '';") && registryFeaturedSection.includes('const displayStoreLinks = liveItems ? groupRegistryStoreLinks(liveItems) : safeStoreLinks;') },
  { name: 'registry types expose itemNeedsAttention', ok: registryTypes.includes('export function itemNeedsAttention') },
  { name: 'registry types expose blocked retailer messaging', ok: registryTypes.includes('Amazon blocks automated product lookups') },
  { name: 'registry types expose quantity sanitation', ok: registryTypes.includes('export function sanitizeRegistryQuantityState') },
  { name: 'registry types expose comparison URL normalization', ok: registryTypes.includes('export function normalizeRegistryComparisonUrl') },
  { name: 'registry types expose title normalization', ok: registryTypes.includes('export function normalizeRegistryTitleForComparison') },
  { name: 'repair state exposes getRegistryRepairStates', ok: repairState.includes('export function getRegistryRepairStates') },
  { name: 'duplicate grouping normalizes title-only items', ok: duplicateRegistryItems.includes('normalizeRegistryTitleForComparison') },
  { name: 'registry cards fall back to canonical page preview URLs', ok: registryItemCard.includes('const pagePreviewSourceUrl = item.item_url ?? item.canonical_url ?? null;') },
  { name: 'registry form seeds canonical links into editable product URLs', ok: registryItemForm.includes("const [urlInput, setUrlInput] = useState(initial?.item_url ?? initial?.canonical_url ?? '');") },
];

const failures = checks.filter((check) => !check.ok);
if (failures.length) {
  console.error('registry guard failed');
  failures.forEach((failure) => console.error(`- ${failure.name}`));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checks: checks.map((check) => check.name) }, null, 2));
