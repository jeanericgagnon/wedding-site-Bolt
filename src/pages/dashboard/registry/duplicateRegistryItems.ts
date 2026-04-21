import type { RegistryItem } from './registryTypes';
import { normalizeRegistryComparisonUrl } from './registryTypes';

function normalizeRegistryTitleForComparison(title: string | null | undefined): string | null {
  const value = (title || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  return value || null;
}

export function findDuplicateRegistryGroups(items: RegistryItem[]): RegistryItem[][] {
  const groups = new Map<string, RegistryItem[]>();

  for (const item of items) {
    const key =
      normalizeRegistryComparisonUrl(item.canonical_url || item.item_url || '') ||
      normalizeRegistryTitleForComparison(item.item_name);
    if (!key) continue;
    const existing = groups.get(key) || [];
    existing.push(item);
    groups.set(key, existing);
  }

  return Array.from(groups.values()).filter((group) => group.length > 1);
}
