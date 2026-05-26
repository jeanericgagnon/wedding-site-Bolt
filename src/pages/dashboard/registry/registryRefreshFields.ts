import { isBadRegistryProductTitle, type RegistryItem, type RegistryPreview } from './registryTypes';

const WEEKLY_REFRESH_MS = 1000 * 60 * 60 * 24 * 7;

function mergeRegistryProductMetadata(
  item: RegistryItem,
  values: {
    selectedRetailer: string | null;
    selectedProductUrl: string | null;
    estimatedPriceCents: number | null;
    availability: string | null;
  },
) {
  if (!item.product_metadata || Array.isArray(item.product_metadata)) return item.product_metadata ?? null;
  return {
    ...item.product_metadata,
    selected_retailer: values.selectedRetailer ?? item.product_metadata.selected_retailer ?? null,
    product_url: values.selectedProductUrl ?? item.product_metadata.product_url ?? null,
    estimated_price_cents: values.estimatedPriceCents ?? item.product_metadata.estimated_price_cents ?? null,
    availability: values.availability ?? item.product_metadata.availability ?? null,
  };
}

function deriveRegistryRefreshRetailer(item: RegistryItem, preview: RegistryPreview) {
  return preview.store_name
    ?? preview.merchant
    ?? preview.retailer
    ?? preview.brand
    ?? item.selected_retailer
    ?? item.merchant
    ?? item.store_name
    ?? null;
}

export function scoreRegistryItemQuality(item: RegistryItem): number {
  let score = 0;
  if (!isBadRegistryProductTitle(item.item_name)) score += 40;
  if (item.image_url) score += 20;
  if (item.price_amount != null || item.price_label) score += 15;
  if (item.merchant || item.store_name || item.selected_retailer) score += 10;
  if (item.description || item.notes) score += 5;
  if (item.metadata_fetch_status === 'success') score += 5;
  score += Math.min(5, Math.max(0, item.metadata_confidence_score ?? 0) * 5);
  return score;
}

export function scoreRegistryPreviewQuality(preview: RegistryPreview): number {
  if (preview.display_mode === 'link_card' || preview.fetch_status === 'blocked' || isBadRegistryProductTitle(preview.title)) {
    return 20;
  }

  let score = 0;
  if (!isBadRegistryProductTitle(preview.title)) score += 40;
  if (preview.image_url) score += 20;
  if (preview.price_amount != null || preview.price_label) score += 15;
  if (preview.merchant || preview.store_name || preview.retailer || preview.brand) score += 10;
  if (preview.description) score += 5;
  if (preview.fetch_status === 'success') score += 5;
  score += Math.min(5, Math.max(0, preview.confidence_score ?? 0) * 5);
  return score;
}

export function getRegistryRefreshSourceUrl(item: Pick<RegistryItem, 'selected_product_url' | 'item_url' | 'canonical_url'>) {
  return item.selected_product_url ?? item.item_url ?? item.canonical_url ?? null;
}

export function buildRegistryRefreshFields(
  item: RegistryItem,
  preview: RegistryPreview,
  options: { replaceExisting?: boolean; autoRefresh?: boolean; now?: Date } = {},
): Partial<RegistryItem> {
  const replaceExisting = Boolean(options.replaceExisting);
  const autoRefresh = Boolean(options.autoRefresh);
  const now = options.now ?? new Date();
  const nowIso = now.toISOString();
  const nextRefreshAt = new Date(now.getTime() + WEEKLY_REFRESH_MS).toISOString();
  const selectedRetailer = deriveRegistryRefreshRetailer(item, preview);
  const selectedProductUrl = preview.canonical_url ?? getRegistryRefreshSourceUrl(item);
  const estimatedPriceCents = preview.price_amount != null
    ? Math.round(preview.price_amount * 100)
    : item.estimated_price_cents ?? null;
  const oldQuality = scoreRegistryItemQuality(item);
  const newQuality = scoreRegistryPreviewQuality(preview);

  if (!replaceExisting && oldQuality > 55 && newQuality < oldQuality) {
    const existingMetadata = item.product_metadata && !Array.isArray(item.product_metadata) ? item.product_metadata : {};
    return {
      metadata_last_checked_at: nowIso,
      next_refresh_at: nextRefreshAt,
      last_auto_refreshed_at: autoRefresh ? nowIso : item.last_auto_refreshed_at ?? null,
      product_metadata: {
        ...existingMetadata,
        registryLastRefreshSkippedReason: 'new_result_worse',
        registryLastRefreshPreviewStatus: preview.fetch_status ?? null,
        registryLastRefreshPreviewMode: preview.display_mode ?? null,
        registryLastRefreshCheckedAt: nowIso,
      },
    };
  }

  const fields: Partial<RegistryItem> = {
    metadata_last_checked_at: nowIso,
    next_refresh_at: nextRefreshAt,
    metadata_fetch_status: preview.fetch_status ?? 'success',
    metadata_confidence_score: preview.confidence_score ?? item.metadata_confidence_score ?? null,
    metadata_source_method: preview.source_method ?? item.metadata_source_method ?? null,
    metadata_retailer: selectedRetailer,
    availability: preview.availability ?? item.availability ?? null,
    selected_retailer: selectedRetailer,
    store_name: selectedRetailer,
    merchant: selectedRetailer,
    selected_product_url: selectedProductUrl,
    item_url: selectedProductUrl,
    canonical_url: preview.canonical_url ?? item.canonical_url ?? selectedProductUrl,
    estimated_price_cents: estimatedPriceCents,
    refresh_fail_count: 0,
    product_metadata: mergeRegistryProductMetadata(item, {
      selectedRetailer,
      selectedProductUrl,
      estimatedPriceCents,
      availability: preview.availability ?? item.availability ?? null,
    }),
  };

  if (preview.title && (replaceExisting || !item.item_name)) fields.item_name = preview.title;
  if (preview.price_label && (replaceExisting || !item.price_label)) fields.price_label = preview.price_label;

  if (preview.price_amount != null) {
    if (item.price_amount != null && item.price_amount !== preview.price_amount) {
      fields.previous_price_amount = item.price_amount;
      fields.price_last_changed_at = nowIso;
    }
    fields.price_amount = preview.price_amount;
  }

  if (preview.image_url && (replaceExisting || !item.image_url)) fields.image_url = preview.image_url;
  if (preview.description && (replaceExisting || !item.description)) fields.description = preview.description;

  if (autoRefresh) {
    fields.last_auto_refreshed_at = nowIso;
  }

  return fields;
}
