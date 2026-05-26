import type { RegistryItem } from './registryTypes.ts';
import { deriveRegistryItemDisplayState, isBadRegistryProductTitle } from './registryTypes.ts';
import { isRegistryItemDue } from '../registryItemTime.ts';

export type RegistryRepairState =
  | 'broken-import'
  | 'partial-import'
  | 'stale-details'
  | 'manual-review'
  | 'retailer-drift'
  | 'proxy-image';

export type RegistryRepairActionKind =
  | 'refresh-details'
  | 'reimport-source'
  | 'review-item'
  | 'review-retailer';

export interface RegistryRepairQueueItem {
  id: string;
  item: RegistryItem;
  states: RegistryRepairState[];
  severity: 'high' | 'medium' | 'low';
  summary: string;
  detail: string;
  primaryAction: RegistryRepairActionKind;
  primaryActionLabel: string;
  secondaryAction: RegistryRepairActionKind;
  secondaryActionLabel: string;
}

function hasProxyImage(item: RegistryItem) {
  const src = (item.image_url || '').toLowerCase();
  return src.includes('thum.io') || src.includes('weserv.nl') || src.includes('ui-avatars');
}

function trimLower(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}

function getRetailerOptionLabels(item: RegistryItem) {
  const options = Array.isArray(item.product_metadata?.['retailer_options'])
    ? item.product_metadata?.['retailer_options'] as Array<Record<string, unknown>>
    : [];
  return options
    .map((option) => trimLower(typeof option.label === 'string' ? option.label : null))
    .filter(Boolean);
}

function hasRetailerDrift(item: RegistryItem) {
  const selectedRetailer = trimLower(item.selected_retailer);
  const metadataRetailer = trimLower(item.metadata_retailer);
  if (selectedRetailer && metadataRetailer && selectedRetailer !== metadataRetailer) return true;

  const optionLabels = getRetailerOptionLabels(item);
  if (selectedRetailer && optionLabels.length > 0 && !optionLabels.includes(selectedRetailer)) return true;

  const selectedProductUrl = (item.selected_product_url || '').trim();
  const productUrl = (item.item_url || item.canonical_url || '').trim();
  if (!selectedProductUrl && optionLabels.length > 0 && productUrl) return true;

  return false;
}

export function getRegistryRepairStates(item: RegistryItem): RegistryRepairState[] {
  const states: RegistryRepairState[] = [];
  const confidence = item.metadata_confidence_score ?? null;
  const displayState = deriveRegistryItemDisplayState(item);
  const linkOnlySafe = displayState.displayMode === 'link_card' && displayState.guestSafe;
  const badTitle = isBadRegistryProductTitle(item.item_name);

  if (linkOnlySafe) {
    if (item.next_refresh_at && isRegistryItemDue(item.next_refresh_at)) states.push('stale-details');
    if (hasRetailerDrift(item)) states.push('retailer-drift');
    return Array.from(new Set(states));
  }

  if (badTitle || item.metadata_fetch_status === 'error' || item.metadata_fetch_status === 'blocked') states.push('broken-import');
  if ((item.metadata_fetch_status === 'success' && confidence !== null && confidence < 0.7) || (!item.image_url || (!item.price_label && item.price_amount == null))) states.push('partial-import');
  if (item.next_refresh_at && isRegistryItemDue(item.next_refresh_at)) states.push('stale-details');
  if ((item.refresh_fail_count ?? 0) > 0) states.push('manual-review');
  if (hasRetailerDrift(item)) states.push('retailer-drift');
  if (hasProxyImage(item)) states.push('proxy-image');

  return Array.from(new Set(states));
}

function buildRepairQueueEntry(item: RegistryItem, states: RegistryRepairState[]): RegistryRepairQueueItem | null {
  if (states.length === 0) return null;

  if (states.includes('broken-import')) {
    return {
      id: `${item.id}-broken-import`,
      item,
      states,
      severity: 'high',
      summary: 'Re-import weak product details',
      detail: 'This gift imported with a broken title or a failed product fetch. Re-import from the source, then review what guests will see.',
      primaryAction: 'reimport-source',
      primaryActionLabel: 'Re-import source',
      secondaryAction: 'review-item',
      secondaryActionLabel: 'Review item',
    };
  }

  if (states.includes('retailer-drift')) {
    return {
      id: `${item.id}-retailer-drift`,
      item,
      states,
      severity: 'high',
      summary: 'Repair the current store choice',
      detail: 'The saved retailer or product link no longer matches the freshest product metadata. Review the store guests should use before this drifts further.',
      primaryAction: 'review-retailer',
      primaryActionLabel: 'Review retailer',
      secondaryAction: 'reimport-source',
      secondaryActionLabel: 'Re-import source',
    };
  }

  if (states.includes('manual-review')) {
    return {
      id: `${item.id}-manual-review`,
      item,
      states,
      severity: 'medium',
      summary: 'Retry a manual review item',
      detail: 'This gift hit a refresh failure or a blocked fetch path. Re-import the source or review the saved details before guests rely on it.',
      primaryAction: 'reimport-source',
      primaryActionLabel: 'Retry import',
      secondaryAction: 'review-item',
      secondaryActionLabel: 'Review item',
    };
  }

  if (states.includes('partial-import') || states.includes('proxy-image')) {
    return {
      id: `${item.id}-partial-import`,
      item,
      states,
      severity: 'medium',
      summary: states.includes('proxy-image') ? 'Upgrade the guest-facing image' : 'Finish the missing gift details',
      detail: states.includes('proxy-image')
        ? 'This gift is still leaning on a fallback preview image. Review it now so guests see a real product photo.'
        : 'Some key details are still missing or low-confidence. Review the title, price, store, and image before calling it done.',
      primaryAction: 'review-item',
      primaryActionLabel: 'Review item',
      secondaryAction: 'refresh-details',
      secondaryActionLabel: 'Refresh details',
    };
  }

  return {
    id: `${item.id}-stale-details`,
    item,
    states,
    severity: 'low',
    summary: 'Refresh stale registry details',
    detail: 'This gift is due for a freshness check. Refresh it now so price, stock, and merchant details do not drift.',
    primaryAction: 'refresh-details',
    primaryActionLabel: 'Refresh details',
    secondaryAction: 'review-item',
    secondaryActionLabel: 'Review item',
  };
}

export function buildRegistryRepairQueue(items: RegistryItem[]): RegistryRepairQueueItem[] {
  return items
    .map((item) => buildRepairQueueEntry(item, getRegistryRepairStates(item)))
    .filter((item): item is RegistryRepairQueueItem => Boolean(item))
    .sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity]
        || a.item.item_name.localeCompare(b.item.item_name);
    });
}
