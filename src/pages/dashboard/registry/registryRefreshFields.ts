import type { RegistryItem, RegistryPreview } from './registryTypes';

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
