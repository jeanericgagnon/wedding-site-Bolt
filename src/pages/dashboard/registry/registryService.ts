import { supabase } from '../../../lib/supabase';
import { resolveActiveSiteForUser } from '../../../lib/activeSite';
import {
  RegistryBarcodeLookupResult,
  RegistryItem,
  RegistryPreview,
  normalizeRegistryComparisonUrl,
  normalizeRegistryTitleForComparison,
  sanitizeRegistryQuantityState,
} from './registryTypes';

const REGISTRY_PREVIEW_ERROR_COPY = 'Couldn’t fill in gift details from that link. You can still add the item by hand.';
const REGISTRY_LOAD_ERROR_COPY = 'Couldn’t load registry items. Please refresh and try again.';
const REGISTRY_SAVE_ERROR_COPY = 'Couldn’t save this gift. Please try again.';
const REGISTRY_DELETE_ERROR_COPY = 'Couldn’t remove that gift. Please try again.';
const REGISTRY_PURCHASE_ERROR_COPY = 'Couldn’t update that gift right now. Please try again.';

const REGISTRY_ITEM_SELECT = 'id, wedding_site_id, item_type, item_name, price_label, price_amount, store_name, merchant, source_type, barcode, item_url, canonical_url, image_url, selected_retailer, selected_product_url, estimated_price_cents, product_metadata, description, notes, quantity_needed, quantity_purchased, purchaser_name, purchase_status, hide_when_purchased, sort_order, priority, availability, metadata_last_checked_at, metadata_fetch_status, metadata_confidence_score, metadata_source_method, metadata_retailer, previous_price_amount, price_last_changed_at, next_refresh_at, last_auto_refreshed_at, refresh_fail_count, fund_goal_amount, fund_received_amount, fund_venmo_url, fund_paypal_url, fund_zelle_handle, fund_custom_url, fund_custom_label, created_at, updated_at' as const;
export const REGISTRY_DASHBOARD_SITE_SELECT = 'id, wedding_date, registry_refresh_enabled_until, registry_monthly_refresh_cap, registry_monthly_refresh_count, registry_monthly_refresh_month, registry_auto_refresh_enabled, registry_refresh_include_purchased, registry_refresh_policy_updated_at, registry_refresh_policy_updated_by' as const;
export const MAX_REGISTRY_ITEMS = 500;
export const MAX_REGISTRY_SORT_LOOKUP_ROWS = 1;

export interface RegistryDashboardSiteRow {
  id: string;
  wedding_date: string | null;
  registry_refresh_enabled_until: string | null;
  registry_monthly_refresh_cap: number | null;
  registry_monthly_refresh_count: number | null;
  registry_monthly_refresh_month: string | null;
  registry_auto_refresh_enabled: boolean | null;
  registry_refresh_include_purchased: boolean | null;
  registry_refresh_policy_updated_at: string | null;
  registry_refresh_policy_updated_by: string | null;
}

export interface RegistryRefreshPolicyPatch {
  registry_monthly_refresh_cap?: number;
  registry_refresh_enabled_until?: string | null;
  registry_auto_refresh_enabled?: boolean;
  registry_refresh_include_purchased?: boolean;
  registry_monthly_refresh_count?: number;
  registry_monthly_refresh_month?: string;
  registry_refresh_policy_updated_at?: string;
  registry_refresh_policy_updated_by?: string | null;
}

function normalizeRegistryItem(item: RegistryItem): RegistryItem {
  const quantityState = sanitizeRegistryQuantityState(item.quantity_purchased, item.quantity_needed);
  return {
    ...item,
    quantity_needed: quantityState.quantityNeeded,
    quantity_purchased: quantityState.quantityPurchased,
    purchase_status: quantityState.purchaseStatus,
  };
}

export async function fetchRegistryItems(weddingSiteId: string): Promise<RegistryItem[]> {
  const { data, error } = await supabase
    .from('registry_items')
    .select(REGISTRY_ITEM_SELECT)
    .eq('wedding_site_id', weddingSiteId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(MAX_REGISTRY_ITEMS);

  if (error) throw new Error(REGISTRY_LOAD_ERROR_COPY);
  return ((data ?? []) as RegistryItem[]).map(normalizeRegistryItem);
}

export async function loadRegistryDashboardSite(userId: string): Promise<RegistryDashboardSiteRow | null> {
  const activeSite = await resolveActiveSiteForUser(userId);
  if (!activeSite?.id) return null;

  const { data, error } = await supabase
    .from('wedding_sites')
    .select(REGISTRY_DASHBOARD_SITE_SELECT)
    .eq('id', activeSite.id)
    .maybeSingle();

  if (error) throw error;
  return (data as RegistryDashboardSiteRow | null) ?? null;
}

export async function updateRegistryRefreshBudget(
  weddingSiteId: string,
  values: { registry_monthly_refresh_count: number; registry_monthly_refresh_month: string },
): Promise<void> {
  const { error } = await supabase.rpc('registry_refresh_policy_write', {
    p_wedding_site_id: weddingSiteId,
    p_patch: values,
  });

  if (error) throw error;
}

export async function saveRegistryRefreshPolicy(
  weddingSiteId: string,
  patch: RegistryRefreshPolicyPatch,
): Promise<void> {
  const { error } = await supabase.rpc('registry_refresh_policy_write', {
    p_wedding_site_id: weddingSiteId,
    p_patch: patch,
  });

  if (error) throw error;
}

export async function createRegistryItem(
  weddingSiteId: string,
  fields: Partial<RegistryItem>
): Promise<RegistryItem> {
  const { data, error } = await supabase.rpc('registry_item_write', {
    p_wedding_site_id: weddingSiteId,
    p_item_id: null,
    p_payload: {
      quantity_needed: 1,
      quantity_purchased: 0,
      purchase_status: 'available',
      hide_when_purchased: false,
      priority: 'medium',
      ...fields,
    },
  });

  if (error) throw new Error(REGISTRY_SAVE_ERROR_COPY);
  return normalizeRegistryItem(data as RegistryItem);
}

export async function updateRegistryItem(
  id: string,
  fields: Partial<RegistryItem>
): Promise<RegistryItem> {
  const { data, error } = await supabase.rpc('registry_item_write', {
    p_wedding_site_id: null,
    p_item_id: id,
    p_payload: fields,
  });

  if (error) throw new Error(REGISTRY_SAVE_ERROR_COPY);
  return normalizeRegistryItem(data as RegistryItem);
}

export async function mergeDuplicateRegistryItems(
  primaryItemId: string,
  secondaryItemIds: string[],
  fields: Partial<RegistryItem>
): Promise<RegistryItem> {
  const { data, error } = await supabase.rpc('registry_duplicate_merge', {
    p_primary_item_id: primaryItemId,
    p_secondary_item_ids: secondaryItemIds,
    p_payload: fields,
  });

  if (error) throw new Error(REGISTRY_SAVE_ERROR_COPY);
  return normalizeRegistryItem(data as RegistryItem);
}

export async function deleteRegistryItem(id: string): Promise<void> {
  const { error } = await supabase.rpc('registry_item_delete', {
    p_item_id: id,
  });
  if (error) throw new Error(REGISTRY_DELETE_ERROR_COPY);
}

export async function reorderRegistryItems(
  weddingSiteId: string,
  orderedIds: string[]
): Promise<void> {
  const { error } = await supabase.rpc('registry_items_reorder', {
    p_wedding_site_id: weddingSiteId,
    p_ordered_ids: orderedIds,
  });
  if (error) throw new Error(REGISTRY_SAVE_ERROR_COPY);
}

export async function fetchUrlPreview(url: string, forceRefresh = false): Promise<RegistryPreview> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const endpoint = `${supabaseUrl}/functions/v1/registry-preview`;

  const invoke = async (accessToken?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Apikey: anonKey,
    };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    return fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url, force_refresh: forceRefresh }),
    });
  };

  let accessToken: string | undefined;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    accessToken = session?.access_token;
  } catch {
    accessToken = undefined;
  }

  let resp: Response;
  try {
    resp = await invoke(accessToken);
    if (resp.status === 401 || resp.status === 403) {
      // Retry with anon-only headers in case local session token expired.
      resp = await invoke();
    }
  } catch {
    throw new Error(REGISTRY_PREVIEW_ERROR_COPY);
  }

  if (!resp.ok) {
    throw new Error(REGISTRY_PREVIEW_ERROR_COPY);
  }

  const result = await resp.json() as RegistryPreview;
  return result;
}

export async function lookupRegistryBarcode(barcode: string): Promise<RegistryBarcodeLookupResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const endpoint = `${supabaseUrl}/functions/v1/registry-barcode-lookup`;

  const invoke = async (accessToken?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Apikey: anonKey,
    };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    return fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ barcode }),
    });
  };

  let accessToken: string | undefined;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    accessToken = session?.access_token;
  } catch {
    accessToken = undefined;
  }

  let response: Response;
  try {
    response = await invoke(accessToken);
    if (response.status === 401 || response.status === 403) {
      response = await invoke();
    }
  } catch {
    throw new Error('Couldn’t look up that barcode right now.');
  }

  const payload = await response.json().catch(() => ({} as RegistryBarcodeLookupResult));

  if (!response.ok) {
    throw new Error(payload?.error || 'Couldn’t look up that barcode right now.');
  }

  return payload as RegistryBarcodeLookupResult;
}

export async function publicFetchRegistryItems(
  weddingSiteId: string,
  access: { inviteToken?: string | null; passwordSession?: string | null } = {},
): Promise<RegistryItem[]> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (supabaseUrl && anonKey) {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/public-registry-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          wedding_site_id: weddingSiteId,
          inviteToken: access.inviteToken ?? null,
          passwordSession: access.passwordSession ?? null,
          limit: MAX_REGISTRY_ITEMS,
        }),
      });

      if (response.ok) {
        const payload = await response.json() as { items?: RegistryItem[] };
        if (Array.isArray(payload.items)) return payload.items.map(normalizeRegistryItem);
      }
    } catch {
      // Fall back to direct anon select for local/dev projects that allow it.
    }
  }

  const { data, error } = await supabase
    .from('registry_items')
    .select(REGISTRY_ITEM_SELECT)
    .eq('wedding_site_id', weddingSiteId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(MAX_REGISTRY_ITEMS);

  if (error) throw new Error(REGISTRY_LOAD_ERROR_COPY);
  return ((data ?? []) as RegistryItem[]).map(normalizeRegistryItem);
}

export async function ownerMarkPurchased(
  itemId: string,
  incrementBy: number
): Promise<RegistryItem> {
  const { data, error } = await supabase.rpc('increment_registry_purchase', {
    p_item_id: itemId,
    p_purchaser_name: null,
    p_increment_by: incrementBy,
  });

  if (error) throw new Error(REGISTRY_PURCHASE_ERROR_COPY);
  return normalizeRegistryItem(data as RegistryItem);
}

export async function publicIncrementPurchase(
  itemId: string,
  purchaserName?: string
): Promise<RegistryItem> {
  const { data, error } = await supabase.rpc('increment_registry_purchase', {
    p_item_id: itemId,
    p_purchaser_name: purchaserName ?? null,
    p_increment_by: 1,
  });

  if (error) throw new Error(REGISTRY_PURCHASE_ERROR_COPY);
  return normalizeRegistryItem(data as RegistryItem);
}

export function findDuplicateItem(
  url: string,
  title: string | null,
  existingItems: RegistryItem[],
  excludeId?: string,
  barcode?: string | null,
): RegistryItem | null {
  const normalizedUrl = normalizeRegistryComparisonUrl(url);
  const normalizedTitle = normalizeRegistryTitleForComparison(title);
  const normalizedBarcode = (barcode || '').trim();

  for (const item of existingItems) {
    if (excludeId && item.id === excludeId) continue;

    if (normalizedBarcode && (item.barcode || '').trim() === normalizedBarcode) {
      return item;
    }

    const itemCanonical = normalizeRegistryComparisonUrl(item.canonical_url);
    const itemUrl = normalizeRegistryComparisonUrl(item.item_url);
    const itemSelectedUrl = normalizeRegistryComparisonUrl(item.selected_product_url);
    const itemTitle = normalizeRegistryTitleForComparison(item.item_name);

    if (normalizedUrl && itemCanonical && itemCanonical === normalizedUrl) {
      return item;
    }

    if (normalizedUrl && itemSelectedUrl && itemSelectedUrl === normalizedUrl) {
      return item;
    }

    if (normalizedUrl && itemUrl && itemUrl === normalizedUrl) {
      return item;
    }

    if (normalizedTitle && itemTitle && itemTitle === normalizedTitle) {
      return item;
    }
  }

  return null;
}
