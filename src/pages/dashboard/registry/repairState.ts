import type { RegistryItem } from './registryTypes';

export type RegistryRepairState = 'broken-import' | 'partial-import' | 'stale-details' | 'manual-review';

export function getRegistryRepairStates(item: RegistryItem): RegistryRepairState[] {
  const states: RegistryRepairState[] = [];
  const confidence = item.metadata_confidence_score ?? null;
  const badTitle = /^(page not found|product unavailable|gift from\s.+)$/i.test((item.item_name || '').trim());

  if (badTitle || item.metadata_fetch_status === 'error' || item.metadata_fetch_status === 'blocked') states.push('broken-import');
  if ((item.metadata_fetch_status === 'success' && confidence !== null && confidence < 0.7) || (!item.image_url || (!item.price_label && item.price_amount == null))) states.push('partial-import');
  if (item.next_refresh_at && new Date(item.next_refresh_at).getTime() < Date.now()) states.push('stale-details');
  if ((item.refresh_fail_count ?? 0) > 0) states.push('manual-review');

  return Array.from(new Set(states));
}
