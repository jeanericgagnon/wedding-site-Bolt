import type { RegistryItem } from './registryTypes';

const WEEKLY_REFRESH_MS = 1000 * 60 * 60 * 24 * 7;

function titleCaseWords(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function deriveRetailerLabel(url: string | null | undefined) {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, '');
    const [root] = hostname.split('.');
    return root
      .split(/[-_]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || null;
  } catch {
    return null;
  }
}

function deriveTitleFromUrl(url: string | null | undefined) {
  if (!url) return null;
  try {
    const pathname = new URL(url).pathname
      .split('/')
      .filter(Boolean)
      .pop();
    if (!pathname) return null;
    const cleaned = pathname
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/\b(p|dp|product|products|gift|shop)\b/gi, ' ')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned ? titleCaseWords(cleaned) : null;
  } catch {
    return null;
  }
}

export function buildDemoRegistryRepairPatch(item: RegistryItem, options?: { replaceExisting?: boolean }): Partial<RegistryItem> {
  const replaceExisting = options?.replaceExisting === true;
  const sourceUrl = item.canonical_url || item.item_url || item.selected_product_url || null;
  const derivedRetailer = deriveRetailerLabel(sourceUrl);
  const derivedTitle = deriveTitleFromUrl(sourceUrl);
  const nowIso = new Date().toISOString();
  const currentName = (item.item_name || '').trim();
  const needsTitleRepair = /^(page not found|product unavailable|gift from\s.+)$/i.test(currentName);

  return {
    item_name: replaceExisting
      ? (derivedTitle || currentName || 'Registry gift')
      : (needsTitleRepair ? (derivedTitle || derivedRetailer || 'Registry gift') : currentName),
    merchant: replaceExisting ? (derivedRetailer || item.merchant || item.store_name) : (item.merchant || item.store_name || derivedRetailer),
    store_name: replaceExisting ? (derivedRetailer || item.store_name || item.merchant) : (item.store_name || item.merchant || derivedRetailer),
    description: item.description || (derivedRetailer ? `Imported from ${derivedRetailer} for owner review.` : 'Imported for owner review.'),
    notes: item.notes || 'Demo cleanup refreshed this gift entry for owner review.',
    metadata_last_checked_at: nowIso,
    metadata_fetch_status: 'success',
    metadata_confidence_score: Math.max(item.metadata_confidence_score ?? 0, 0.76),
    metadata_source_method: 'heuristic',
    metadata_retailer: (derivedRetailer || item.metadata_retailer || item.merchant || item.store_name || '').toLowerCase() || null,
    next_refresh_at: new Date(Date.now() + WEEKLY_REFRESH_MS).toISOString(),
    last_auto_refreshed_at: nowIso,
    refresh_fail_count: 0,
    updated_at: nowIso,
  };
}
