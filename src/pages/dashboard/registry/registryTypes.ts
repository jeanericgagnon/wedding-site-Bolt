export type PurchaseStatus = 'available' | 'partial' | 'purchased';
export type RegistrySourceType = 'barcode' | 'link' | 'manual' | 'cash_fund';
export type RegistryItemType = 'product' | 'link' | 'cash_fund' | 'manual_gift';
export type RegistryDisplayMode = 'product_card' | 'link_card' | 'cash_fund' | 'manual_card' | 'review_only' | 'hidden';
export type RegistrySourceStatus = 'clean' | 'partial' | 'blocked' | 'timeout' | 'invalid_url' | 'parse_failed' | 'manual' | 'not_imported';
export type RegistryReviewStatus = 'clean' | 'needs_review' | 'missing_price' | 'missing_image' | 'weak_title' | 'blocked_source' | 'duplicate_candidate' | 'manual_override';

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
  display_mode?: RegistryDisplayMode | null;
  guest_safe?: boolean | null;
  source_status?: RegistrySourceStatus | null;
  review_status?: RegistryReviewStatus | null;
  confidence_overall?: number | null;
  confidence_title?: number | null;
  confidence_price?: number | null;
  confidence_image?: number | null;
  confidence_availability?: number | null;
  import_reason?: string | null;
  import_source_method?: string | null;
  parser_version?: string | null;
  last_imported_at?: string | null;
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
export type SourceMethod = 'jsonld' | 'opengraph' | 'adapter' | 'retailer_adapter' | 'fallback' | 'heuristic' | 'manual' | 'link_only' | null;

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
  display_mode?: RegistryDisplayMode;
  guest_safe?: boolean;
  source_status?: RegistrySourceStatus;
  review_status?: RegistryReviewStatus;
  import_reason?: string | null;
  owner_message?: string | null;
  confidence?: {
    overall?: number | null;
    title?: number | null;
    price?: number | null;
    image?: number | null;
    availability?: number | null;
    canonical_url?: number | null;
  } | null;
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
  provider_path?: string[] | null;
  from_cache: boolean;
  confidence_score: number;
  review_required?: boolean;
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
  displayMode: RegistryDisplayMode;
  guestSafe: boolean;
  reviewStatus: RegistryReviewStatus;
  repairStates?: string[];
}

const BAD_REGISTRY_TITLE_TERMS = [
  'access denied',
  '404 not found',
  'robot or human',
  'verify you are human',
  'are you a robot',
  'forbidden',
  'blocked',
  'attention required',
  'captcha',
  'gift link needs review',
  'home furniture, home decor',
  'product unavailable',
  'page not found',
];

export function isBadRegistryProductTitle(itemName: string | null | undefined): boolean {
  const title = (itemName || '').replace(/\s+/g, ' ').trim();
  if (!title) return true;
  const clean = title.toLowerCase();
  if (clean.length < 8) return true;
  if (BAD_REGISTRY_TITLE_TERMS.some((term) => clean.includes(term))) return true;
  if (/^[a-z]?\s?\d{5,}$/i.test(title)) return true;
  if (/^[a-z0-9\-_/]{6,}$/i.test(title) && !title.includes(' ')) return true;
  return false;
}

export function hasBadRegistryImportTitle(itemName: string | null | undefined): boolean {
  return isBadRegistryProductTitle(itemName);
}

export function deriveRegistryStoreNameFromUrl(url: string | null | undefined): string | null {
  const raw = (url || '').trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const known: Array<[RegExp, string]> = [
      [/amazon\./, 'Amazon'],
      [/target\./, 'Target'],
      [/walmart\./, 'Walmart'],
      [/bestbuy\./, 'Best Buy'],
      [/ikea\./, 'IKEA'],
      [/potterybarn\./, 'Pottery Barn'],
      [/crateandbarrel\./, 'Crate & Barrel'],
      [/williams-sonoma\./, 'Williams Sonoma'],
      [/macys\./, "Macy's"],
      [/(^|\.)rei\./, 'REI'],
    ];
    const matched = known.find(([pattern]) => pattern.test(host));
    if (matched) return matched[1];
    return host
      .split('.')[0]
      .split(/[-_]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || null;
  } catch {
    return null;
  }
}

export function getRegistryLinkOnlyTitle(storeName: string | null | undefined): string {
  const normalized = (storeName || '').replace(/\s+/g, ' ').trim();
  return normalized ? `Gift from ${normalized}` : 'Gift from store';
}

function hasSafeRegistryWebUrl(url: string | null | undefined): boolean {
  const raw = (url || '').trim();
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function deriveRegistryItemStoreName(item: Pick<RegistryItem, 'store_name' | 'merchant' | 'selected_retailer' | 'metadata_retailer' | 'selected_product_url' | 'item_url' | 'canonical_url'>): string | null {
  return item.store_name
    || item.merchant
    || item.selected_retailer
    || item.metadata_retailer
    || deriveRegistryStoreNameFromUrl(item.selected_product_url || item.item_url || item.canonical_url);
}

export function deriveRegistryItemDisplayState(item: RegistryItem): {
  displayMode: RegistryDisplayMode;
  guestSafe: boolean;
  reviewStatus: RegistryReviewStatus;
  safeTitle: string;
} {
  if (item.item_type === 'cash_fund') {
    return { displayMode: 'cash_fund', guestSafe: true, reviewStatus: 'clean', safeTitle: item.item_name || 'Cash fund' };
  }

  const url = [item.selected_product_url, item.item_url, item.canonical_url].find(hasSafeRegistryWebUrl) ?? null;
  const storeName = deriveRegistryItemStoreName(item);
  const badTitle = isBadRegistryProductTitle(item.item_name);
  const fetchStatus = String(item.metadata_fetch_status || '').toLowerCase();
  const blockedOrFailed = ['blocked', 'timeout', 'parse_failure', 'unsupported', 'error'].includes(fetchStatus);
  const metadataDisplayMode = item.product_metadata?.registryDisplayMode;
  const explicitMode = typeof metadataDisplayMode === 'string'
    ? metadataDisplayMode as RegistryDisplayMode
    : item.display_mode ?? null;
  const explicitGuestSafe = typeof item.guest_safe === 'boolean'
    ? item.guest_safe
    : typeof item.product_metadata?.registryGuestSafe === 'boolean'
      ? item.product_metadata.registryGuestSafe
      : null;
  const explicitReviewStatus = item.review_status
    ?? (typeof item.product_metadata?.registryReviewStatus === 'string'
      ? item.product_metadata.registryReviewStatus as RegistryReviewStatus
      : null);
  const explicitSourceStatus = item.source_status
    ?? (typeof item.product_metadata?.registrySourceStatus === 'string'
      ? item.product_metadata.registrySourceStatus as RegistrySourceStatus
      : null);

  if (explicitMode === 'hidden' || explicitMode === 'review_only') {
    return { displayMode: explicitMode, guestSafe: false, reviewStatus: explicitReviewStatus ?? 'needs_review', safeTitle: badTitle ? 'Needs review' : item.item_name };
  }

  if ((badTitle || blockedOrFailed || explicitSourceStatus === 'blocked' || explicitMode === 'link_card') && url) {
    return {
      displayMode: 'link_card',
      guestSafe: explicitGuestSafe ?? true,
      reviewStatus: explicitReviewStatus ?? (blockedOrFailed || explicitSourceStatus === 'blocked' ? 'blocked_source' : 'weak_title'),
      safeTitle: getRegistryLinkOnlyTitle(storeName),
    };
  }

  if (badTitle) {
    return { displayMode: 'review_only', guestSafe: false, reviewStatus: 'weak_title', safeTitle: 'Needs review' };
  }

  if (item.source_type === 'manual') {
    return { displayMode: 'manual_card', guestSafe: explicitGuestSafe ?? true, reviewStatus: explicitReviewStatus ?? 'clean', safeTitle: item.item_name };
  }

  return { displayMode: explicitMode ?? 'product_card', guestSafe: explicitGuestSafe ?? true, reviewStatus: explicitReviewStatus ?? 'clean', safeTitle: item.item_name };
}

export function buildRegistryLinkOnlyRepairPatch(item: RegistryItem): Partial<RegistryItem> | null {
  const url = [item.selected_product_url, item.item_url, item.canonical_url].find(hasSafeRegistryWebUrl) ?? null;
  if (!url) return null;

  const storeName = deriveRegistryItemStoreName(item);
  const safeTitle = getRegistryLinkOnlyTitle(storeName);
  const blockedLike = ['blocked', 'timeout', 'parse_failure', 'unsupported', 'error'].includes(String(item.metadata_fetch_status || '').toLowerCase())
    || item.source_status === 'blocked';
  const existingMetadata = item.product_metadata && !Array.isArray(item.product_metadata) ? item.product_metadata : {};

  return {
    item_name: safeTitle,
    item_type: 'product',
    price_label: null,
    price_amount: null,
    image_url: null,
    merchant: storeName,
    store_name: storeName,
    selected_retailer: item.selected_retailer ?? storeName,
    selected_product_url: item.selected_product_url ?? url,
    item_url: item.item_url ?? url,
    canonical_url: item.canonical_url ?? url,
    display_mode: 'link_card',
    guest_safe: true,
    source_status: blockedLike ? 'blocked' : 'partial',
    review_status: blockedLike ? 'blocked_source' : 'needs_review',
    import_reason: blockedLike
      ? `${storeName ?? 'Store'} blocked product details. Converted to a clean link-only gift.`
      : 'Converted to a clean link-only gift because product details were not reliable.',
    import_source_method: 'link_only',
    confidence_overall: 0.4,
    confidence_title: 0,
    confidence_price: 0,
    confidence_image: 0,
    confidence_availability: 0,
    metadata_fetch_status: blockedLike ? 'blocked' : 'success',
    metadata_confidence_score: 0.4,
    metadata_source_method: 'link_only',
    metadata_retailer: item.metadata_retailer ?? storeName,
    metadata_last_checked_at: new Date().toISOString(),
    last_imported_at: new Date().toISOString(),
    product_metadata: {
      ...existingMetadata,
      registryDisplayMode: 'link_card',
      registryGuestSafe: true,
      registryReviewStatus: blockedLike ? 'blocked_source' : 'needs_review',
      registrySourceStatus: blockedLike ? 'blocked' : 'partial',
      registryImportReason: blockedLike
        ? `${storeName ?? 'Store'} blocked product details. Converted to a clean link-only gift.`
        : 'Converted to a clean link-only gift because product details were not reliable.',
      registryImportSourceMethod: 'link_only',
    },
  };
}

export function buildRegistryHiddenReviewPatch(item: RegistryItem): Partial<RegistryItem> | null {
  if (!isBadRegistryProductTitle(item.item_name)) return null;

  const existingMetadata = item.product_metadata && !Array.isArray(item.product_metadata) ? item.product_metadata : {};
  const now = new Date().toISOString();

  return {
    item_name: 'Needs review',
    display_mode: 'review_only',
    guest_safe: false,
    source_status: item.source_status ?? 'parse_failed',
    review_status: 'needs_review',
    import_reason: 'Hidden from guests because the saved item details were not reliable and no safe store link was available.',
    import_source_method: item.import_source_method ?? 'manual',
    metadata_fetch_status: item.metadata_fetch_status ?? 'error',
    metadata_last_checked_at: now,
    last_imported_at: now,
    product_metadata: {
      ...existingMetadata,
      registryDisplayMode: 'review_only',
      registryGuestSafe: false,
      registryReviewStatus: 'needs_review',
      registryImportReason: 'Hidden from guests because the saved item details were not reliable and no safe store link was available.',
    },
  };
}

export function buildRegistrySafetyRevalidationPatch(item: RegistryItem): Partial<RegistryItem> | null {
  const displayState = deriveRegistryItemDisplayState(item);
  const metadataState = getRegistryItemMetadataState(item);
  const existingMetadata = item.product_metadata && !Array.isArray(item.product_metadata) ? item.product_metadata : {};
  const blockedLike = ['blocked', 'timeout', 'parse_failure', 'unsupported', 'error'].includes(String(item.metadata_fetch_status || '').toLowerCase())
    || item.source_status === 'blocked';

  const nextSourceStatus: RegistrySourceStatus = displayState.displayMode === 'link_card'
    ? (blockedLike ? 'blocked' : 'partial')
    : displayState.displayMode === 'review_only'
      ? (item.source_status ?? 'parse_failed')
      : (item.source_status ?? (metadataState.preview.partial ? 'partial' : 'clean'));

  const nextImportReason = displayState.displayMode === 'link_card'
    ? (blockedLike
      ? `${deriveRegistryItemStoreName(item) ?? 'Store'} blocked product details. Converted to a clean link-only gift.`
      : 'Converted to a clean link-only gift because product details were not reliable.')
    : displayState.displayMode === 'review_only'
      ? 'Hidden from guests because the saved item details were not reliable and no safe store link was available.'
      : item.import_reason;

  const nextImportSourceMethod = displayState.displayMode === 'link_card'
    ? 'link_only'
    : item.import_source_method;

  const nextItemName = (displayState.displayMode === 'link_card' || displayState.displayMode === 'review_only')
    ? displayState.safeTitle
    : item.item_name;

  const patch: Partial<RegistryItem> = {
    item_name: nextItemName,
    display_mode: displayState.displayMode,
    guest_safe: displayState.guestSafe,
    review_status: displayState.reviewStatus,
    source_status: nextSourceStatus,
    import_reason: nextImportReason ?? null,
    import_source_method: nextImportSourceMethod ?? null,
    confidence_overall: metadataState.preview.confidence?.overall ?? item.confidence_overall ?? null,
    confidence_title: metadataState.preview.confidence?.title ?? item.confidence_title ?? null,
    confidence_price: metadataState.preview.confidence?.price ?? item.confidence_price ?? null,
    confidence_image: metadataState.preview.confidence?.image ?? item.confidence_image ?? null,
    confidence_availability: metadataState.preview.confidence?.availability ?? item.confidence_availability ?? null,
    metadata_last_checked_at: new Date().toISOString(),
    product_metadata: {
      ...existingMetadata,
      registryDisplayMode: displayState.displayMode,
      registryGuestSafe: displayState.guestSafe,
      registryReviewStatus: displayState.reviewStatus,
      registrySourceStatus: nextSourceStatus,
      registryImportReason: nextImportReason ?? null,
      registryImportSourceMethod: nextImportSourceMethod ?? null,
    },
  };

  const changed = (
    patch.item_name !== item.item_name
    || patch.display_mode !== (item.display_mode ?? null)
    || patch.guest_safe !== (item.guest_safe ?? null)
    || patch.review_status !== (item.review_status ?? null)
    || patch.source_status !== (item.source_status ?? null)
    || patch.import_reason !== (item.import_reason ?? null)
    || patch.import_source_method !== (item.import_source_method ?? null)
    || patch.confidence_overall !== (item.confidence_overall ?? null)
    || patch.confidence_title !== (item.confidence_title ?? null)
    || patch.confidence_price !== (item.confidence_price ?? null)
    || patch.confidence_image !== (item.confidence_image ?? null)
    || patch.confidence_availability !== (item.confidence_availability ?? null)
    || existingMetadata.registryDisplayMode !== displayState.displayMode
    || existingMetadata.registryGuestSafe !== displayState.guestSafe
    || existingMetadata.registryReviewStatus !== displayState.reviewStatus
    || existingMetadata.registrySourceStatus !== nextSourceStatus
    || (existingMetadata.registryImportReason ?? null) !== (nextImportReason ?? null)
    || (existingMetadata.registryImportSourceMethod ?? null) !== (nextImportSourceMethod ?? null)
  );

  return changed ? patch : null;
}

export function getOwnerRegistryDisplayTitle(itemName: string | null | undefined, item?: RegistryItem): string {
  if (item) return deriveRegistryItemDisplayState(item).safeTitle;
  return hasBadRegistryImportTitle(itemName) ? 'Needs review' : (itemName || '').trim() || 'Untitled gift';
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
    source_method: (item.import_source_method as RegistryPreview['source_method']) ?? (item.metadata_source_method as RegistryPreview['source_method']) ?? null,
    fetch_status: (item.metadata_fetch_status as RegistryPreview['fetch_status']) ?? null,
    error: null,
    partial: item.metadata_fetch_status === 'success' && (item.metadata_confidence_score ?? 0) < 0.7,
    missing_fields: [
      !item.item_name ? 'title' : null,
      item.price_amount == null && !item.price_label ? 'price' : null,
      !item.image_url ? 'image' : null,
      !(item.merchant ?? item.store_name) ? 'merchant' : null,
    ].filter((v): v is string => Boolean(v)),
    display_mode: item.display_mode ?? undefined,
    guest_safe: item.guest_safe ?? undefined,
    source_status: item.source_status ?? undefined,
    review_status: item.review_status ?? undefined,
    import_reason: item.import_reason ?? null,
    confidence: {
      overall: item.confidence_overall ?? item.metadata_confidence_score ?? null,
      title: item.confidence_title ?? null,
      price: item.confidence_price ?? null,
      image: item.confidence_image ?? null,
      availability: item.confidence_availability ?? null,
      canonical_url: null,
    },
  };
}

export function getRegistryItemMetadataState(item: RegistryItem): RegistryItemMetadataState {
  const preview = buildRegistryPreviewFromItem(item);
  const confidence = computeConfidence(preview);
  const blockedMessage = getBlockedMessage(preview);
  const missingSummary = preview.missing_fields && preview.missing_fields.length > 0
    ? `Missing: ${preview.missing_fields.join(', ')}`
    : null;
  const hasBadImportTitle = hasBadRegistryImportTitle(item.item_name);
  const displayState = deriveRegistryItemDisplayState(item);

  return {
    preview,
    confidence,
    blockedMessage,
    missingSummary,
    hasBadImportTitle,
    displayMode: displayState.displayMode,
    guestSafe: displayState.guestSafe,
    reviewStatus: displayState.reviewStatus,
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
  quantity_purchased?: string;
  purchaser_name?: string;
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
  quantity_purchased: '0',
  purchaser_name: '',
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
    (metadataState.displayMode !== 'link_card' && metadataState.blockedMessage) ||
    (metadataState.displayMode !== 'link_card' && metadataState.hasBadImportTitle) ||
    metadataState.missingSummary ||
    (item.item_type !== 'cash_fund' && !item.image_url)
  );
}
