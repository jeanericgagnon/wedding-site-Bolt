export type PurchaseStatus = 'available' | 'partial' | 'purchased';
export type RegistrySourceType = 'barcode' | 'link' | 'manual' | 'cash_fund';

export interface RegistryItem {
  id: string;
  wedding_site_id: string;
  item_type?: 'product' | 'cash_fund';
  item_name: string;
  price_label: string | null;
  price_amount: number | null;
  store_name: string | null;
  merchant: string | null;
  source_type?: RegistrySourceType | null;
  barcode?: string | null;
  item_url: string | null;
  canonical_url: string | null;
  image_url: string | null;
  selected_retailer?: string | null;
  selected_product_url?: string | null;
  estimated_price_cents?: number | null;
  product_metadata?: Record<string, unknown> | null;
  description: string | null;
  notes: string | null;
  quantity_needed: number;
  quantity_purchased: number;
  purchaser_name: string | null;
  purchase_status: PurchaseStatus;
  hide_when_purchased: boolean;
  sort_order: number;
  priority: string;
  availability?: string | null;
  metadata_last_checked_at?: string | null;
  metadata_fetch_status?: string | null;
  metadata_confidence_score?: number | null;
  metadata_source_method?: string | null;
  metadata_retailer?: string | null;
  previous_price_amount?: number | null;
  price_last_changed_at?: string | null;
  next_refresh_at?: string | null;
  last_auto_refreshed_at?: string | null;
  refresh_fail_count?: number | null;
  fund_goal_amount?: number | null;
  fund_received_amount?: number | null;
  fund_venmo_url?: string | null;
  fund_paypal_url?: string | null;
  fund_zelle_handle?: string | null;
  fund_custom_url?: string | null;
  fund_custom_label?: string | null;
  created_at: string;
  updated_at: string;
}

export type MetadataConfidence = 'full' | 'partial' | 'manual';
export type FetchStatus = 'success' | 'blocked' | 'timeout' | 'parse_failure' | 'unsupported' | 'error';
export type SourceMethod = 'jsonld' | 'opengraph' | 'adapter' | 'heuristic' | 'manual' | null;

export interface RegistryPreview {
  title: string | null;
  price_label: string | null;
  price_amount: number | null;
  image_url: string | null;
  merchant: string | null;
  store_name?: string | null;
  canonical_url: string | null;
  description: string | null;
  currency: string | null;
  availability: string | null;
  brand: string | null;
  retailer: string | null;
  confidence_score: number | null;
  source_method: SourceMethod;
  fetch_status: FetchStatus | null;
  error: string | null;
  partial?: boolean;
  missing_fields?: string[];
}

export interface RegistryBarcodeRetailerOption {
  label: string;
  url: string | null;
  price_cents: number | null;
  currency: string | null;
  is_best_match?: boolean;
}

export interface RegistryBarcodeLookupResult {
  ok: boolean;
  matched: boolean;
  barcode: string;
  normalized_barcode: string;
  format: string | null;
  provider: string | null;
  from_cache: boolean;
  confidence_score: number;
  title: string | null;
  brand: string | null;
  image_url: string | null;
  category: string | null;
  description: string | null;
  estimated_price_cents: number | null;
  currency: string | null;
  product_url: string | null;
  selected_retailer: string | null;
  retailer_options: RegistryBarcodeRetailerOption[];
  raw_payload?: Record<string, unknown> | null;
  error?: string | null;
}

export interface RegistryItemMetadataState {
  preview: RegistryPreview;
  confidence: MetadataConfidence;
  blockedMessage: string | null;
  missingSummary: string | null;
  hasBadImportTitle: boolean;
  repairStates?: string[];
}

export function computeConfidence(preview: RegistryPreview): MetadataConfidence {
  if (preview.fetch_status && preview.fetch_status !== 'success') return 'manual';
  const score = preview.confidence_score;
  if (score != null) {
    if (score >= 0.7) return 'full';
    if (score >= 0.4) return 'partial';
    return 'manual';
  }
  const fields = [preview.title, preview.price_label ?? preview.price_amount, preview.image_url, preview.merchant];
  const filled = fields.filter(Boolean).length;
  if (preview.error) return 'manual';
  if (filled >= 3) return 'full';
  if (filled >= 1) return 'partial';
  return 'manual';
}

export function getBlockedMessage(preview: RegistryPreview): string | null {
  if (preview.fetch_status !== 'blocked') return null;
  const r = preview.retailer;
  if (r === 'amazon') return 'Amazon blocks automatic product lookups. Paste the title and price below. The product link will still work for guests.';
  if (r === 'target') return 'Target blocks automated lookups. Fill in the details below — the link will still open correctly for guests.';
  if (r === 'walmart') return 'Walmart blocks automatic lookups. Fill in the details below.';
  return 'This store blocks automated product lookups. Fill in the name, price, and store below — your product link has been saved.';
}

export function buildRegistryPreviewFromItem(item: RegistryItem): RegistryPreview {
  return {
    title: item.item_name ?? null,
    price_label: item.price_label ?? null,
    price_amount: item.price_amount ?? null,
    image_url: item.image_url ?? null,
    merchant: item.merchant ?? null,
    store_name: item.store_name ?? null,
    canonical_url: item.canonical_url ?? null,
    description: item.description ?? null,
    currency: null,
    availability: item.availability ?? null,
    brand: null,
    retailer: item.metadata_retailer ?? null,
    confidence_score: item.metadata_confidence_score ?? null,
    source_method: (item.metadata_source_method as RegistryPreview['source_method']) ?? null,
    fetch_status: (item.metadata_fetch_status as RegistryPreview['fetch_status']) ?? null,
    error: null,
    partial: item.metadata_fetch_status === 'success' && (item.metadata_confidence_score ?? 0) < 0.7,
    missing_fields: [
      !item.item_name ? 'title' : null,
      item.price_amount == null && !item.price_label ? 'price' : null,
      !item.image_url ? 'image' : null,
      !(item.merchant ?? item.store_name) ? 'merchant' : null,
    ].filter((v): v is string => Boolean(v)),
  };
}

export function getRegistryItemMetadataState(item: RegistryItem): RegistryItemMetadataState {
  const preview = buildRegistryPreviewFromItem(item);
  const confidence = computeConfidence(preview);
  const blockedMessage = getBlockedMessage(preview);
  const missingSummary = preview.missing_fields && preview.missing_fields.length > 0
    ? `Missing: ${preview.missing_fields.join(', ')}`
    : null;
  const hasBadImportTitle = /^(page not found|product unavailable|gift from\s.+)$/i.test((item.item_name || '').trim());

  return {
    preview,
    confidence,
    blockedMessage,
    missingSummary,
    hasBadImportTitle,
    repairStates: [
      hasBadImportTitle ? 'broken-import' : null,
      preview.partial ? 'partial-import' : null,
      missingSummary ? 'stale-details' : null,
      blockedMessage ? 'manual-review' : null,
    ].filter((value): value is string => Boolean(value)),
  };
}

export interface RegistryItemDraft {
  item_type?: 'product' | 'cash_fund';
  source_type?: RegistrySourceType;
  item_name: string;
  barcode?: string;
  price_label: string;
  price_amount: string;
  merchant: string;
  item_url: string;
  image_url: string;
  selected_retailer?: string;
  selected_product_url?: string;
  estimated_price_cents?: string;
  product_metadata?: Record<string, unknown> | null;
  notes: string;
  desired_quantity: string;
  hide_when_purchased: boolean;
  fund_goal_amount?: string;
  fund_received_amount?: string;
  fund_venmo_url?: string;
  fund_paypal_url?: string;
  fund_zelle_handle?: string;
  fund_custom_url?: string;
  fund_custom_label?: string;
  canonical_url?: string;
  description?: string;
  availability?: string;
  metadata_fetch_status?: FetchStatus | '';
  metadata_confidence_score?: number | null;
  metadata_source_method?: SourceMethod;
  metadata_retailer?: string;
}

export const EMPTY_DRAFT: RegistryItemDraft = {
  source_type: 'manual',
  item_name: '',
  barcode: '',
  price_label: '',
  price_amount: '',
  merchant: '',
  item_url: '',
  image_url: '',
  selected_retailer: '',
  selected_product_url: '',
  estimated_price_cents: '',
  product_metadata: null,
  notes: '',
  desired_quantity: '1',
  hide_when_purchased: false,
  item_type: 'product',
  fund_goal_amount: '',
  fund_received_amount: '',
  fund_venmo_url: '',
  fund_paypal_url: '',
  fund_zelle_handle: '',
  fund_custom_url: '',
  fund_custom_label: '',
  canonical_url: '',
  description: '',
  availability: '',
  metadata_fetch_status: '',
  metadata_confidence_score: null,
  metadata_source_method: null,
  metadata_retailer: '',
};

export type RegistryFilter = 'all' | 'available' | 'partial' | 'purchased';

export function derivePurchaseStatus(quantityPurchased: number, quantityNeeded: number): PurchaseStatus {
  if (quantityPurchased <= 0) return 'available';
  if (quantityPurchased >= quantityNeeded) return 'purchased';
  return 'partial';
}

export function sanitizeRegistryQuantityState(quantityPurchased: number, quantityNeeded: number) {
  const safeNeeded = Math.max(1, Math.trunc(quantityNeeded || 0) || 1);
  const safePurchased = Math.max(0, Math.min(Math.trunc(quantityPurchased || 0) || 0, safeNeeded));

  return {
    quantityNeeded: safeNeeded,
    quantityPurchased: safePurchased,
    purchaseStatus: derivePurchaseStatus(safePurchased, safeNeeded),
  };
}

export function normalizeRegistryComparisonUrl(url: string | null | undefined): string | null {
  const value = (url || '').trim();
  if (!value) return null;
  try {
    const parsed = new URL(value.startsWith('http') ? value : `https://${value}`);
    parsed.hash = '';
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'ref', 'ref_', 'tag', 'ascsubtag', 'asc_source', 'campaign', 'mc_cid', 'mc_eid'
    ];
    trackingParams.forEach((key) => parsed.searchParams.delete(key));
    const normalizedPath = parsed.pathname.replace(/\/$/, '');
    return `${parsed.hostname.toLowerCase()}${normalizedPath}${parsed.search ? `?${parsed.searchParams.toString()}` : ''}`;
  } catch {
    return value.toLowerCase();
  }
}

export function normalizeRegistryTitleForComparison(title: string | null | undefined): string | null {
  const value = (title || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  return value || null;
}

export function itemNeedsAttention(item: RegistryItem): boolean {
  const metadataState = getRegistryItemMetadataState(item);
  return Boolean(
    metadataState.blockedMessage ||
    metadataState.hasBadImportTitle ||
    metadataState.missingSummary ||
    (item.item_type !== 'cash_fund' && !item.image_url)
  );
}
