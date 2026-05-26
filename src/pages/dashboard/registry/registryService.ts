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
import {
  MAX_REGISTRY_ITEMS,
  MAX_REGISTRY_SORT_LOOKUP_ROWS,
  REGISTRY_DASHBOARD_SITE_SELECT,
  REGISTRY_ITEM_SELECT,
} from './registryQueries';

const REGISTRY_PREVIEW_ERROR_COPY = 'Couldn’t fill in gift details from that link. You can still add the item by hand.';
const REGISTRY_LOAD_ERROR_COPY = 'Couldn’t load registry items. Please refresh and try again.';
const REGISTRY_SAVE_ERROR_COPY = 'Couldn’t save this gift. Please try again.';
const REGISTRY_DELETE_ERROR_COPY = 'Couldn’t remove that gift. Please try again.';
const REGISTRY_PURCHASE_ERROR_COPY = 'Couldn’t update that gift right now. Please try again.';

export interface RegistryImportBatchItemRecord {
  id: string;
  original_url: string;
  normalized_url: string | null;
  registry_item_id: string | null;
  result: 'clean' | 'link_only' | 'needs_review' | 'duplicate' | 'failed';
  store_name: string | null;
  display_title: string | null;
  reason: string | null;
  created_at: string;
}

export interface RegistryImportBatchRecord {
  id: string;
  wedding_site_id: string;
  created_by: string;
  total_count: number;
  clean_count: number;
  link_only_count: number;
  needs_review_count: number;
  duplicate_count: number;
  failed_count: number;
  status: 'processing' | 'complete' | 'failed';
  created_at: string;
  completed_at: string | null;
  items: RegistryImportBatchItemRecord[];
}

export interface RegistryDashboardSiteRow {
  id: string;
  site_slug: string | null;
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

export async function fetchLatestRegistryImportBatch(weddingSiteId: string): Promise<RegistryImportBatchRecord | null> {
  const { data, error } = await supabase
    .from('registry_import_batches')
    .select('id, wedding_site_id, created_by, total_count, clean_count, link_only_count, needs_review_count, duplicate_count, failed_count, status, created_at, completed_at, items:registry_import_batch_items(id, original_url, normalized_url, registry_item_id, result, store_name, display_title, reason, created_at)')
    .eq('wedding_site_id', weddingSiteId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as RegistryImportBatchRecord | null) ?? null;
}

export async function fetchRecentRegistryImportBatches(
  weddingSiteId: string,
  limit = 5,
): Promise<RegistryImportBatchRecord[]> {
  const { data, error } = await supabase
    .from('registry_import_batches')
    .select('id, wedding_site_id, created_by, total_count, clean_count, link_only_count, needs_review_count, duplicate_count, failed_count, status, created_at, completed_at, items:registry_import_batch_items(id, original_url, normalized_url, registry_item_id, result, store_name, display_title, reason, created_at)')
    .eq('wedding_site_id', weddingSiteId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as RegistryImportBatchRecord[] | null) ?? [];
}

export async function saveRegistryImportBatch(
  weddingSiteId: string,
  summary: {
    totalCount: number;
    cleanCount: number;
    linkOnlyCount: number;
    needsReviewCount: number;
    duplicateCount: number;
    failedCount: number;
    items: Array<{
      url: string;
      result: 'clean' | 'link_only' | 'needs_review' | 'duplicate' | 'failed';
      displayTitle: string;
      storeName: string | null;
      reason: string | null;
      registryItemId?: string | null;
    }>;
  },
): Promise<RegistryImportBatchRecord | null> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return null;

  const { data: batch, error: batchError } = await supabase
    .from('registry_import_batches')
    .insert({
      wedding_site_id: weddingSiteId,
      created_by: userId,
      total_count: summary.totalCount,
      clean_count: summary.cleanCount,
      link_only_count: summary.linkOnlyCount,
      needs_review_count: summary.needsReviewCount,
      duplicate_count: summary.duplicateCount,
      failed_count: summary.failedCount,
      status: 'processing',
    })
    .select('id, wedding_site_id, created_by, total_count, clean_count, link_only_count, needs_review_count, duplicate_count, failed_count, status, created_at, completed_at')
    .single();

  if (batchError) throw batchError;

  if (summary.items.length > 0) {
    const { error: itemsError } = await supabase
      .from('registry_import_batch_items')
      .insert(summary.items.map((item) => ({
        batch_id: batch.id,
        original_url: item.url,
        normalized_url: normalizeRegistryComparisonUrl(item.url),
        registry_item_id: item.registryItemId ?? null,
        result: item.result,
        store_name: item.storeName,
        display_title: item.displayTitle,
        reason: item.reason,
      })));

    if (itemsError) throw itemsError;
  }

  const finalStatus: RegistryImportBatchRecord['status'] = summary.failedCount >= summary.totalCount ? 'failed' : 'complete';
  const completedAt = new Date().toISOString();
  const { data: completedBatch, error: completedError } = await supabase
    .from('registry_import_batches')
    .update({
      status: finalStatus,
      completed_at: completedAt,
    })
    .eq('id', batch.id)
    .select('id, wedding_site_id, created_by, total_count, clean_count, link_only_count, needs_review_count, duplicate_count, failed_count, status, created_at, completed_at, items:registry_import_batch_items(id, original_url, normalized_url, registry_item_id, result, store_name, display_title, reason, created_at)')
    .single();

  if (completedError) throw completedError;
  return (completedBatch as RegistryImportBatchRecord | null) ?? null;
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
