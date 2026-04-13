import type { RegistryItem } from './registryTypes';
import { normalizeRegistryComparisonUrl } from './registryTypes';

export function findDuplicateRegistryGroups(items: RegistryItem[]): RegistryItem[][] {
  const groups = new Map<string, RegistryItem[]>();

  for (const item of items) {
    const key = normalizeRegistryComparisonUrl(item.canonical_url || item.item_url || '') || item.item_name.toLowerCase().trim();
    if (!key) continue;
    const existing = groups.get(key) || [];
    existing.push(item);
    groups.set(key, existing);
  }

  return Array.from(groups.values()).filter((group) => group.length > 1);
}
