import type { RegistryRepairQueueItem, RegistryRepairState } from './repairState.ts';

export type RegistryCleanupFocus = 'all' | 'review' | 'details' | 'retailer' | 'freshness';

export type RegistryCleanupGroupDefinition = {
  key: Exclude<RegistryCleanupFocus, 'all'>;
  label: string;
  summary: string;
  states: RegistryRepairState[];
  recommendedAction: string;
  focusCtaLabel: string;
};

export type RegistryCleanupGroup = RegistryCleanupGroupDefinition & {
  items: RegistryRepairQueueItem[];
};

export const REGISTRY_CLEANUP_GROUPS: RegistryCleanupGroupDefinition[] = [
  {
    key: 'review',
    label: 'Needs review',
    summary: 'Broken imports, weak titles, and blocked refreshes that need a direct owner check.',
    states: ['broken-import', 'manual-review'],
    recommendedAction: 'Run cleanup first, then open anything still unresolved.',
    focusCtaLabel: 'Run cleanup for weak imports',
  },
  {
    key: 'details',
    label: 'Missing image or details',
    summary: 'Items that can stay guest-safe, but still need stronger photos, prices, or product detail.',
    states: ['partial-import', 'proxy-image'],
    recommendedAction: 'Refresh photos or review item details before sharing widely.',
    focusCtaLabel: 'Refresh item details',
  },
  {
    key: 'retailer',
    label: 'Store drift',
    summary: 'Saved store choices that no longer match the freshest retailer or product link.',
    states: ['retailer-drift'],
    recommendedAction: 'Review the current store choice before guests use the wrong link.',
    focusCtaLabel: 'Review store choices',
  },
  {
    key: 'freshness',
    label: 'Refresh later',
    summary: 'Older items that mostly look fine, but are due for a routine freshness check.',
    states: ['stale-details'],
    recommendedAction: 'Refresh in batches when you want fresher price and stock truth.',
    focusCtaLabel: 'Refresh older items',
  },
];

export function getRegistryCleanupGroupKey(queueItem: RegistryRepairQueueItem): RegistryCleanupFocus {
  const matchedGroup = REGISTRY_CLEANUP_GROUPS.find((group) => group.states.some((state) => queueItem.states.includes(state)));
  return matchedGroup?.key ?? 'freshness';
}

export function buildRegistryCleanupGroups(repairQueue: RegistryRepairQueueItem[]): RegistryCleanupGroup[] {
  return REGISTRY_CLEANUP_GROUPS
    .map((group) => ({
      ...group,
      items: repairQueue.filter((queueItem) => getRegistryCleanupGroupKey(queueItem) === group.key),
    }))
    .filter((group) => group.items.length > 0);
}
