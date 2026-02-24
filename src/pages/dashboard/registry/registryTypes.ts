export type PurchaseStatus = 'available' | 'partial' | 'purchased';

export interface RegistryItem {
  id: string;
  wedding_site_id: string;
  item_type?: 'product' | 'cash_fund';
  item_name: string;
  price_label: string | null;
  price_amount: number | null;
  store_name: string | null;
  merchant: string | null;
  item_url: string | null;
  canonical_url: string | null;
  image_url: string | null;
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
  if (r === 'amazon') return 'Amazon blocks automated product lookups. Paste the title and price manually — the product link will still work for guests.';
  if (r === 'target') return 'Target blocks automated lookups. Fill in the details below — the link will still open correctly for guests.';
  if (r === 'walmart') return 'Walmart blocks automated lookups. Fill in the details below manually.';
  return 'This store blocks automated product lookups. Fill in the name, price, and store below — your product link has been saved.';
}

export interface RegistryItemDraft {
  item_type?: 'product' | 'cash_fund';
  item_name: string;
  price_label: string;
  price_amount: string;
  merchant: string;
  item_url: string;
  image_url: string;
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
}

export const EMPTY_DRAFT: RegistryItemDraft = {
  item_name: '',
  price_label: '',
  price_amount: '',
  merchant: '',
  item_url: '',
  image_url: '',
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
};

export type RegistryFilter = 'all' | 'available' | 'partial' | 'purchased';
