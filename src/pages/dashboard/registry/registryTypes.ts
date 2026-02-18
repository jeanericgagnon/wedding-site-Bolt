export type PurchaseStatus = 'available' | 'partial' | 'purchased';

export interface RegistryItem {
  id: string;
  wedding_site_id: string;
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
  created_at: string;
  updated_at: string;
}

export type MetadataConfidence = 'full' | 'partial' | 'manual';

export interface RegistryPreview {
  title: string | null;
  price_label: string | null;
  price_amount: number | null;
  image_url: string | null;
  merchant: string | null;
  canonical_url: string | null;
  error: string | null;
  confidence?: MetadataConfidence;
}

export function computeConfidence(preview: RegistryPreview): MetadataConfidence {
  const fields = [preview.title, preview.price_label ?? preview.price_amount, preview.image_url, preview.merchant];
  const filled = fields.filter(Boolean).length;
  if (preview.error) return 'manual';
  if (filled >= 3) return 'full';
  if (filled >= 1) return 'partial';
  return 'manual';
}

export interface RegistryItemDraft {
  item_name: string;
  price_label: string;
  price_amount: string;
  merchant: string;
  item_url: string;
  image_url: string;
  notes: string;
  desired_quantity: string;
  hide_when_purchased: boolean;
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
};

export type RegistryFilter = 'all' | 'available' | 'partial' | 'purchased';
