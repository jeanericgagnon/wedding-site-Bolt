import type { RegistryItem } from './registryTypes';
import { normalizeRegistryComparisonUrl, normalizeRegistryTitleForComparison } from './registryTypes';

export type RegistryDuplicateSignalKind =
  | 'barcode'
  | 'product-url'
  | 'canonical-url'
  | 'title-store'
  | 'title-price'
  | 'title';

export interface RegistryDuplicateSignal {
  kind: RegistryDuplicateSignalKind;
  label: string;
  value: string | null;
}

export interface RegistryDuplicateGroup {
  id: string;
  items: RegistryItem[];
  primaryItem: RegistryItem;
  secondaryItems: RegistryItem[];
  signals: RegistryDuplicateSignal[];
  mergedQuantityNeeded: number;
  mergedQuantityPurchased: number;
}

function normalizeRegistryMerchantForComparison(item: Pick<RegistryItem, 'merchant' | 'store_name' | 'selected_retailer'>): string | null {
  return normalizeRegistryTitleForComparison(item.selected_retailer || item.merchant || item.store_name || null);
}

function getComparableRegistryUrls(item: Pick<RegistryItem, 'canonical_url' | 'item_url' | 'selected_product_url'>) {
  const seen = new Set<string>();
  const entries = [
    ['canonical-url', normalizeRegistryComparisonUrl(item.canonical_url)] as const,
    ['product-url', normalizeRegistryComparisonUrl(item.selected_product_url || item.item_url || null)] as const,
  ];

  return entries.filter((entry) => {
    if (!entry[1] || seen.has(entry[1])) return false;
    seen.add(entry[1]);
    return true;
  });
}

function getDuplicateSignals(a: RegistryItem, b: RegistryItem): RegistryDuplicateSignal[] {
  const signals: RegistryDuplicateSignal[] = [];
  const seen = new Set<string>();
  const push = (signal: RegistryDuplicateSignal) => {
    const key = `${signal.kind}:${signal.value ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    signals.push(signal);
  };

  const barcodeA = (a.barcode || '').trim();
  const barcodeB = (b.barcode || '').trim();
  if (barcodeA && barcodeB && barcodeA === barcodeB) {
    push({ kind: 'barcode', label: 'Same barcode', value: barcodeA });
  }

  const urlsA = getComparableRegistryUrls(a);
  const urlsB = getComparableRegistryUrls(b);
  for (const [kindA, valueA] of urlsA) {
    for (const [kindB, valueB] of urlsB) {
      if (!valueA || !valueB || valueA !== valueB) continue;
      if (kindA === 'product-url' || kindB === 'product-url') {
        push({ kind: 'product-url', label: 'Same store link', value: valueA });
      } else {
        push({ kind: 'canonical-url', label: 'Same canonical link', value: valueA });
      }
    }
  }

  const titleA = normalizeRegistryTitleForComparison(a.item_name);
  const titleB = normalizeRegistryTitleForComparison(b.item_name);
  if (!titleA || !titleB || titleA !== titleB) return signals;

  const merchantA = normalizeRegistryMerchantForComparison(a);
  const merchantB = normalizeRegistryMerchantForComparison(b);
  if (merchantA && merchantB && merchantA === merchantB) {
    push({ kind: 'title-store', label: 'Same title and store', value: `${titleA}:${merchantA}` });
    return signals;
  }

  const priceA = a.price_amount;
  const priceB = b.price_amount;
  const samePrice =
    priceA != null &&
    priceB != null &&
    Math.abs(priceA - priceB) <= Math.max(1, Math.min(priceA, priceB) * 0.05);

  if (samePrice) {
    push({ kind: 'title-price', label: 'Same title and price', value: titleA });
    return signals;
  }

  push({ kind: 'title', label: 'Same title', value: titleA });
  return signals;
}

function scoreRegistryItemForPrimary(item: RegistryItem) {
  const metadataScore = item.metadata_confidence_score ?? 0;
  const hasCanonical = item.canonical_url ? 8 : 0;
  const hasSelectedProductUrl = item.selected_product_url ? 6 : 0;
  const hasBarcode = item.barcode ? 6 : 0;
  const hasImage = item.image_url ? 5 : 0;
  const hasPrice = item.price_amount != null || item.price_label ? 5 : 0;
  const hasMerchant = item.merchant || item.store_name ? 4 : 0;
  const hasDescription = item.description || item.notes ? 3 : 0;
  const purchasedBoost = (item.quantity_purchased ?? 0) * 4;
  const updatedBoost = Date.parse(item.updated_at || item.created_at || '') || 0;

  return (
    metadataScore * 100 +
    hasCanonical +
    hasSelectedProductUrl +
    hasBarcode +
    hasImage +
    hasPrice +
    hasMerchant +
    hasDescription +
    purchasedBoost +
    updatedBoost / 1_000_000_000_000
  );
}

function choosePrimaryRegistryItem(items: RegistryItem[]) {
  return [...items].sort((a, b) => scoreRegistryItemForPrimary(b) - scoreRegistryItemForPrimary(a))[0];
}

function pickPreferredValue<T>(items: RegistryItem[], selector: (item: RegistryItem) => T | null | undefined): T | null {
  for (const item of [...items].sort((a, b) => scoreRegistryItemForPrimary(b) - scoreRegistryItemForPrimary(a))) {
    const value = selector(item);
    if (value != null && value !== '') return value;
  }
  return null;
}

function mergeUniqueTextBlocks(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = (value || '').trim();
    if (!trimmed) continue;
    const normalized = trimmed.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(trimmed);
  }
  return result.join('\n\n') || null;
}

function pickLatestTimestamp(values: Array<string | null | undefined>) {
  const candidates = values
    .map((value) => {
      const time = value ? Date.parse(value) : Number.NaN;
      return Number.isFinite(time) ? { value, time } : null;
    })
    .filter((value): value is { value: string; time: number } => Boolean(value))
    .sort((a, b) => b.time - a.time);

  return candidates[0]?.value ?? null;
}

function pickEarliestTimestamp(values: Array<string | null | undefined>) {
  const candidates = values
    .map((value) => {
      const time = value ? Date.parse(value) : Number.NaN;
      return Number.isFinite(time) ? { value, time } : null;
    })
    .filter((value): value is { value: string; time: number } => Boolean(value))
    .sort((a, b) => a.time - b.time);

  return candidates[0]?.value ?? null;
}

function chooseRegistryProductMetadata(items: RegistryItem[]) {
  return [...items]
    .map((item) => item.product_metadata)
    .filter((value): value is Record<string, unknown> => Boolean(value && Object.keys(value).length > 0))
    .sort((a, b) => Object.keys(b).length - Object.keys(a).length)[0] ?? null;
}

export function buildRegistryDuplicateMergePatch(primaryItem: RegistryItem, secondaryItems: RegistryItem[]): Partial<RegistryItem> {
  const allItems = [primaryItem, ...secondaryItems];
  const totalPurchased = allItems.reduce((sum, item) => sum + Math.max(0, item.quantity_purchased ?? 0), 0);
  const maxNeeded = allItems.reduce((max, item) => Math.max(max, item.quantity_needed ?? 1), 1);
  const mergedQuantityNeeded = Math.max(1, maxNeeded, totalPurchased);
  const mergedQuantityPurchased = Math.min(mergedQuantityNeeded, totalPurchased);
  const mergedPurchaserNames = Array.from(new Set(allItems.map((item) => (item.purchaser_name || '').trim()).filter(Boolean)));
  const preferredPriceAmount = pickPreferredValue(allItems, (item) => item.price_amount);
  const preferredEstimatedPriceCents = pickPreferredValue(allItems, (item) => item.estimated_price_cents);

  return {
    item_type: pickPreferredValue(allItems, (item) => item.item_type || null) ?? primaryItem.item_type ?? 'product',
    source_type: pickPreferredValue(allItems, (item) => item.source_type || null) ?? primaryItem.source_type ?? 'manual',
    item_name: pickPreferredValue(allItems, (item) => item.item_name) ?? primaryItem.item_name,
    barcode: pickPreferredValue(allItems, (item) => item.barcode) ?? null,
    price_label: pickPreferredValue(allItems, (item) => item.price_label) ?? null,
    price_amount: preferredPriceAmount,
    merchant: pickPreferredValue(allItems, (item) => item.merchant || item.store_name || item.selected_retailer || null),
    store_name: pickPreferredValue(allItems, (item) => item.store_name || item.merchant || item.selected_retailer || null),
    item_url: pickPreferredValue(allItems, (item) => item.selected_product_url) ??
      pickPreferredValue(allItems, (item) => item.item_url || item.canonical_url || null),
    canonical_url: pickPreferredValue(allItems, (item) => item.canonical_url || item.selected_product_url || item.item_url || null),
    image_url: pickPreferredValue(allItems, (item) => item.image_url),
    selected_retailer: pickPreferredValue(allItems, (item) => item.selected_retailer || item.metadata_retailer || item.merchant || item.store_name || null),
    selected_product_url: pickPreferredValue(allItems, (item) => item.selected_product_url) ??
      pickPreferredValue(allItems, (item) => item.item_url || item.canonical_url || null),
    estimated_price_cents: preferredEstimatedPriceCents ?? (preferredPriceAmount != null ? Math.round(preferredPriceAmount * 100) : null),
    product_metadata: chooseRegistryProductMetadata(allItems),
    description: mergeUniqueTextBlocks(allItems.map((item) => item.description)),
    notes: mergeUniqueTextBlocks(allItems.map((item) => item.notes || item.description)),
    quantity_needed: mergedQuantityNeeded,
    quantity_purchased: mergedQuantityPurchased,
    purchase_status:
      mergedQuantityPurchased <= 0
        ? 'available'
        : mergedQuantityPurchased >= mergedQuantityNeeded
          ? 'purchased'
          : 'partial',
    purchaser_name: mergedPurchaserNames.length > 0 ? mergedPurchaserNames.join(', ').slice(0, 120) : null,
    hide_when_purchased: allItems.some((item) => item.hide_when_purchased),
    availability: pickPreferredValue(allItems, (item) => item.availability),
    metadata_last_checked_at: pickLatestTimestamp(allItems.map((item) => item.metadata_last_checked_at)),
    metadata_fetch_status: pickPreferredValue(allItems, (item) => item.metadata_fetch_status),
    metadata_confidence_score: allItems.reduce((max, item) => Math.max(max, item.metadata_confidence_score ?? 0), 0) || null,
    metadata_source_method: pickPreferredValue(allItems, (item) => item.metadata_source_method),
    metadata_retailer: pickPreferredValue(allItems, (item) => item.metadata_retailer || item.selected_retailer || item.merchant || item.store_name || null),
    previous_price_amount: pickPreferredValue(allItems, (item) => item.previous_price_amount),
    price_last_changed_at: pickLatestTimestamp(allItems.map((item) => item.price_last_changed_at)),
    next_refresh_at: pickEarliestTimestamp(allItems.map((item) => item.next_refresh_at)),
    last_auto_refreshed_at: pickLatestTimestamp(allItems.map((item) => item.last_auto_refreshed_at)),
    refresh_fail_count: allItems.reduce((max, item) => Math.max(max, item.refresh_fail_count ?? 0), 0),
    fund_goal_amount: pickPreferredValue(allItems, (item) => item.fund_goal_amount),
    fund_received_amount: allItems.reduce((sum, item) => sum + Math.max(0, item.fund_received_amount ?? 0), 0),
    fund_venmo_url: pickPreferredValue(allItems, (item) => item.fund_venmo_url),
    fund_paypal_url: pickPreferredValue(allItems, (item) => item.fund_paypal_url),
    fund_zelle_handle: pickPreferredValue(allItems, (item) => item.fund_zelle_handle),
    fund_custom_url: pickPreferredValue(allItems, (item) => item.fund_custom_url),
    fund_custom_label: pickPreferredValue(allItems, (item) => item.fund_custom_label),
  };
}

function collectGroupSignals(items: RegistryItem[]) {
  const signals: RegistryDuplicateSignal[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < items.length; index += 1) {
    for (let innerIndex = index + 1; innerIndex < items.length; innerIndex += 1) {
      for (const signal of getDuplicateSignals(items[index], items[innerIndex])) {
        const key = `${signal.kind}:${signal.value ?? ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        signals.push(signal);
      }
    }
  }

  return signals;
}

export function buildRegistryDuplicateGroups(items: RegistryItem[]): RegistryDuplicateGroup[] {
  const parent = new Map<string, string>();
  const allItems = items.filter((item) => item.item_type !== 'cash_fund' || item.item_url || item.canonical_url || item.item_name);

  const find = (id: string): string => {
    const existing = parent.get(id) ?? id;
    if (existing === id) {
      parent.set(id, id);
      return id;
    }
    const root = find(existing);
    parent.set(id, root);
    return root;
  };

  const union = (left: string, right: string) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot);
  };

  for (const item of allItems) parent.set(item.id, item.id);

  for (let index = 0; index < allItems.length; index += 1) {
    for (let innerIndex = index + 1; innerIndex < allItems.length; innerIndex += 1) {
      if (getDuplicateSignals(allItems[index], allItems[innerIndex]).length > 0) {
        union(allItems[index].id, allItems[innerIndex].id);
      }
    }
  }

  const grouped = new Map<string, RegistryItem[]>();
  for (const item of allItems) {
    const root = find(item.id);
    const existing = grouped.get(root) || [];
    existing.push(item);
    grouped.set(root, existing);
  }

  return Array.from(grouped.values())
    .filter((group) => group.length > 1)
    .map((group) => {
      const primaryItem = choosePrimaryRegistryItem(group);
      const itemsSorted = [primaryItem, ...group.filter((item) => item.id !== primaryItem.id).sort((a, b) => scoreRegistryItemForPrimary(b) - scoreRegistryItemForPrimary(a))];
      const secondaryItems = itemsSorted.filter((item) => item.id !== primaryItem.id);
      const mergedPatch = buildRegistryDuplicateMergePatch(primaryItem, secondaryItems);

      return {
        id: `${primaryItem.id}:${secondaryItems.map((item) => item.id).join(',')}`,
        items: itemsSorted,
        primaryItem,
        secondaryItems,
        signals: collectGroupSignals(itemsSorted),
        mergedQuantityNeeded: mergedPatch.quantity_needed ?? primaryItem.quantity_needed,
        mergedQuantityPurchased: mergedPatch.quantity_purchased ?? primaryItem.quantity_purchased,
      };
    })
    .sort((a, b) => {
      if (b.items.length !== a.items.length) return b.items.length - a.items.length;
      return scoreRegistryItemForPrimary(b.primaryItem) - scoreRegistryItemForPrimary(a.primaryItem);
    });
}

export function findDuplicateRegistryGroups(items: RegistryItem[]): RegistryItem[][] {
  return buildRegistryDuplicateGroups(items).map((group) => group.items);
}
