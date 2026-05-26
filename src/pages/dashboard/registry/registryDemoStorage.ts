import { demoRegistryItems, demoWeddingSite } from '../../../lib/demoData';
import { normalizeRegistryThankYouLedger, type RegistryThankYouLedger } from '../../../lib/registryLaunchReadiness';
import type { RegistryItem } from './registryTypes';
import type { RegistrySourceType } from './registryTypes';

export const DEMO_REGISTRY_STATE_STORAGE_KEY = 'dayof.demo.registry.state.v1';

interface RegistryDemoStateEnvelope {
  savedAtISO: string;
  value: {
    items: RegistryItem[];
    thankYouLedger: RegistryThankYouLedger;
  };
}

interface RegistryDemoStateSnapshot {
  items: RegistryItem[];
  thankYouLedger: RegistryThankYouLedger;
}

const MAX_DEMO_REGISTRY_ITEMS = 200;

function sanitizeRegistryQuantityState(quantityPurchased = 0, quantityNeeded = 1) {
  const safeNeeded = Math.max(1, Number.isFinite(quantityNeeded) ? quantityNeeded : 1);
  const safePurchased = Math.max(0, Number.isFinite(quantityPurchased) ? quantityPurchased : 0);
  const purchaseStatus = safePurchased >= safeNeeded ? 'purchased' : safePurchased > 0 ? 'partial' : 'available';
  return {
    quantityNeeded: safeNeeded,
    quantityPurchased: safePurchased,
    purchaseStatus,
  } as const;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function defaultDemoRegistryItems(): RegistryItem[] {
  return demoRegistryItems.map((item, index) => {
    const quantityState = sanitizeRegistryQuantityState(item.quantity_purchased ?? 0, item.quantity_needed ?? 1);
    const nowIso = new Date().toISOString();
    return {
      id: item.id,
      wedding_site_id: demoWeddingSite.id,
      item_name: item.item_name,
      price_label: null,
      price_amount: item.price ?? null,
      store_name: item.store_name ?? null,
      merchant: item.store_name ?? null,
      item_url: null,
      canonical_url: null,
      image_url: null,
      description: null,
      notes: null,
      quantity_needed: quantityState.quantityNeeded,
      quantity_purchased: quantityState.quantityPurchased,
      purchaser_name: null,
      purchase_status: quantityState.purchaseStatus,
      hide_when_purchased: false,
      sort_order: index,
      priority: item.priority,
      availability: null,
      metadata_last_checked_at: null,
      metadata_fetch_status: null,
      metadata_confidence_score: null,
      metadata_source_method: null,
      metadata_retailer: null,
      previous_price_amount: null,
      price_last_changed_at: null,
      next_refresh_at: null,
      last_auto_refreshed_at: null,
      refresh_fail_count: 0,
      created_at: nowIso,
      updated_at: nowIso,
    };
  });
}

function defaultDemoRegistryState(): RegistryDemoStateSnapshot {
  return {
    items: defaultDemoRegistryItems(),
    thankYouLedger: {},
  };
}

function normalizeDemoRegistryItems(value: unknown): RegistryItem[] {
  if (!Array.isArray(value)) return defaultDemoRegistryState().items;
  return value.slice(0, MAX_DEMO_REGISTRY_ITEMS).flatMap((rawItem, index) => {
    if (!isRecord(rawItem) || typeof rawItem.id !== 'string' || typeof rawItem.item_name !== 'string') return [];
    const quantityState = sanitizeRegistryQuantityState(Number(rawItem.quantity_purchased), Number(rawItem.quantity_needed));
    return [{
      id: rawItem.id,
      wedding_site_id: typeof rawItem.wedding_site_id === 'string' ? rawItem.wedding_site_id : demoWeddingSite.id,
      item_name: rawItem.item_name,
      item_type: rawItem.item_type === 'cash_fund' ? 'cash_fund' : 'product',
      source_type: rawItem.source_type === 'barcode' || rawItem.source_type === 'link' || rawItem.source_type === 'manual' || rawItem.source_type === 'cash_fund'
        ? rawItem.source_type as RegistrySourceType
        : 'manual',
      barcode: typeof rawItem.barcode === 'string' && rawItem.barcode.trim() ? rawItem.barcode.trim() : null,
      price_label: typeof rawItem.price_label === 'string' && rawItem.price_label.trim() ? rawItem.price_label : null,
      price_amount: Number.isFinite(Number(rawItem.price_amount)) ? Number(rawItem.price_amount) : null,
      store_name: typeof rawItem.store_name === 'string' && rawItem.store_name.trim() ? rawItem.store_name : null,
      merchant: typeof rawItem.merchant === 'string' && rawItem.merchant.trim() ? rawItem.merchant : null,
      item_url: typeof rawItem.item_url === 'string' && rawItem.item_url.trim() ? rawItem.item_url : null,
      canonical_url: typeof rawItem.canonical_url === 'string' && rawItem.canonical_url.trim() ? rawItem.canonical_url : null,
      image_url: typeof rawItem.image_url === 'string' && rawItem.image_url.trim() ? rawItem.image_url : null,
      selected_retailer: typeof rawItem.selected_retailer === 'string' && rawItem.selected_retailer.trim() ? rawItem.selected_retailer : null,
      selected_product_url: typeof rawItem.selected_product_url === 'string' && rawItem.selected_product_url.trim() ? rawItem.selected_product_url : null,
      estimated_price_cents: Number.isFinite(Number(rawItem.estimated_price_cents)) ? Number(rawItem.estimated_price_cents) : null,
      product_metadata: isRecord(rawItem.product_metadata) ? rawItem.product_metadata : null,
      description: typeof rawItem.description === 'string' ? rawItem.description : null,
      notes: typeof rawItem.notes === 'string' ? rawItem.notes : null,
      quantity_needed: quantityState.quantityNeeded,
      quantity_purchased: quantityState.quantityPurchased,
      purchaser_name: quantityState.purchaseStatus === 'available' || typeof rawItem.purchaser_name !== 'string' || !rawItem.purchaser_name.trim()
        ? null
        : rawItem.purchaser_name.trim(),
      purchase_status: quantityState.purchaseStatus,
      hide_when_purchased: Boolean(rawItem.hide_when_purchased),
      sort_order: Number.isFinite(Number(rawItem.sort_order)) ? Number(rawItem.sort_order) : index,
      priority: rawItem.priority === 'high' || rawItem.priority === 'medium' || rawItem.priority === 'low' ? rawItem.priority : 'medium',
      availability: typeof rawItem.availability === 'string' && rawItem.availability.trim() ? rawItem.availability : null,
      metadata_last_checked_at: typeof rawItem.metadata_last_checked_at === 'string' ? rawItem.metadata_last_checked_at : null,
      metadata_fetch_status: typeof rawItem.metadata_fetch_status === 'string' ? rawItem.metadata_fetch_status : null,
      metadata_confidence_score: Number.isFinite(Number(rawItem.metadata_confidence_score)) ? Number(rawItem.metadata_confidence_score) : null,
      metadata_source_method: typeof rawItem.metadata_source_method === 'string' ? rawItem.metadata_source_method : null,
      metadata_retailer: typeof rawItem.metadata_retailer === 'string' && rawItem.metadata_retailer.trim() ? rawItem.metadata_retailer : null,
      previous_price_amount: Number.isFinite(Number(rawItem.previous_price_amount)) ? Number(rawItem.previous_price_amount) : null,
      price_last_changed_at: typeof rawItem.price_last_changed_at === 'string' ? rawItem.price_last_changed_at : null,
      next_refresh_at: typeof rawItem.next_refresh_at === 'string' ? rawItem.next_refresh_at : null,
      last_auto_refreshed_at: typeof rawItem.last_auto_refreshed_at === 'string' ? rawItem.last_auto_refreshed_at : null,
      refresh_fail_count: Number.isFinite(Number(rawItem.refresh_fail_count)) ? Math.max(0, Number(rawItem.refresh_fail_count)) : 0,
      fund_goal_amount: Number.isFinite(Number(rawItem.fund_goal_amount)) ? Number(rawItem.fund_goal_amount) : null,
      fund_received_amount: Number.isFinite(Number(rawItem.fund_received_amount)) ? Number(rawItem.fund_received_amount) : 0,
      fund_venmo_url: typeof rawItem.fund_venmo_url === 'string' && rawItem.fund_venmo_url.trim() ? rawItem.fund_venmo_url : null,
      fund_paypal_url: typeof rawItem.fund_paypal_url === 'string' && rawItem.fund_paypal_url.trim() ? rawItem.fund_paypal_url : null,
      fund_zelle_handle: typeof rawItem.fund_zelle_handle === 'string' && rawItem.fund_zelle_handle.trim() ? rawItem.fund_zelle_handle : null,
      fund_custom_url: typeof rawItem.fund_custom_url === 'string' && rawItem.fund_custom_url.trim() ? rawItem.fund_custom_url : null,
      fund_custom_label: typeof rawItem.fund_custom_label === 'string' && rawItem.fund_custom_label.trim() ? rawItem.fund_custom_label : null,
      created_at: typeof rawItem.created_at === 'string' ? rawItem.created_at : new Date().toISOString(),
      updated_at: typeof rawItem.updated_at === 'string' ? rawItem.updated_at : new Date().toISOString(),
    }];
  });
}

export function readDemoRegistryState(storageKey = DEMO_REGISTRY_STATE_STORAGE_KEY): RegistryDemoStateSnapshot {
  const defaults = defaultDemoRegistryState();
  if (typeof window === 'undefined') return defaults;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return defaults;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !isRecord(parsed.value)) {
      window.localStorage.removeItem(storageKey);
      return defaults;
    }

    const items = normalizeDemoRegistryItems(parsed.value.items);
    const thankYouLedger = normalizeRegistryThankYouLedger(parsed.value.thankYouLedger);
    const snapshot: RegistryDemoStateSnapshot = {
      items: items.length > 0 ? items : defaults.items,
      thankYouLedger,
    };
    writeDemoRegistryState(snapshot, storageKey);
    return snapshot;
  } catch {
    window.localStorage.removeItem(storageKey);
    return defaults;
  }
}

export function writeDemoRegistryState(
  input: RegistryDemoStateSnapshot,
  storageKey = DEMO_REGISTRY_STATE_STORAGE_KEY,
): RegistryDemoStateSnapshot {
  const snapshot: RegistryDemoStateSnapshot = {
    items: normalizeDemoRegistryItems(input.items),
    thankYouLedger: normalizeRegistryThankYouLedger(input.thankYouLedger),
  };

  if (typeof window !== 'undefined') {
    const envelope: RegistryDemoStateEnvelope = {
      savedAtISO: new Date().toISOString(),
      value: snapshot,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(envelope));
  }

  return snapshot;
}
