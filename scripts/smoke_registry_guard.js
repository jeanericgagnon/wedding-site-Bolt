#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const registryPage = readFileSync(resolve(process.cwd(), 'src/pages/dashboard/Registry.tsx'), 'utf8');
const registryTypes = readFileSync(resolve(process.cwd(), 'src/pages/dashboard/registry/registryTypes.ts'), 'utf8');

const checks = [
  { name: 'dashboard uses sanitizeRegistryQuantityState', ok: registryPage.includes('sanitizeRegistryQuantityState') },
  { name: 'dashboard loads duplicate registry groups', ok: registryPage.includes('findDuplicateRegistryGroups') },
  { name: 'registry types expose itemNeedsAttention', ok: registryTypes.includes('export function itemNeedsAttention') },
  { name: 'registry types expose blocked retailer messaging', ok: registryTypes.includes('Amazon blocks automated product lookups') },
  { name: 'registry types expose quantity sanitation', ok: registryTypes.includes('export function sanitizeRegistryQuantityState') },
  { name: 'registry types expose comparison URL normalization', ok: registryTypes.includes('export function normalizeRegistryComparisonUrl') },
];

const failures = checks.filter((check) => !check.ok);
if (failures.length) {
  console.error('registry guard failed');
  failures.forEach((failure) => console.error(`- ${failure.name}`));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checks: checks.map((check) => check.name) }, null, 2));
