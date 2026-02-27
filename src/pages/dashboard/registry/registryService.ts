import { supabase } from '../../../lib/supabase';
import { RegistryItem, RegistryPreview } from './registryTypes';

export async function fetchRegistryItems(weddingSiteId: string): Promise<RegistryItem[]> {
  const { data, error } = await supabase
    .from('registry_items')
    .select('*')
    .eq('wedding_site_id', weddingSiteId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as RegistryItem[];
}

export async function createRegistryItem(
  weddingSiteId: string,
  fields: Partial<RegistryItem>
): Promise<RegistryItem> {
  const maxOrderResult = await supabase
    .from('registry_items')
    .select('sort_order')
    .eq('wedding_site_id', weddingSiteId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = ((maxOrderResult.data?.sort_order as number | null) ?? -1) + 1;

  const { data, error } = await supabase
    .from('registry_items')
    .insert({
      wedding_site_id: weddingSiteId,
      sort_order: nextOrder,
      quantity_needed: 1,
      quantity_purchased: 0,
      purchase_status: 'available',
      hide_when_purchased: false,
      priority: 'medium',
      ...fields,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as RegistryItem;
}

export async function updateRegistryItem(
  id: string,
  fields: Partial<RegistryItem>
): Promise<RegistryItem> {
  const { data, error } = await supabase
    .from('registry_items')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as RegistryItem;
}

export async function deleteRegistryItem(id: string): Promise<void> {
  const { error } = await supabase.from('registry_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function reorderRegistryItems(
  weddingSiteId: string,
  orderedIds: string[]
): Promise<void> {
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('registry_items')
      .update({ sort_order: index, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('wedding_site_id', weddingSiteId)
  );
  await Promise.all(updates);
}

export async function fetchUrlPreview(url: string, forceRefresh = false): Promise<RegistryPreview> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const endpoint = `${supabaseUrl}/functions/v1/registry-preview`;

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error('Authentication error. Please refresh the page and sign in again.');
  }

  if (!session?.access_token) {
    throw new Error('No active session. Please sign in to use this feature.');
  }

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      Apikey: anonKey,
    },
    body: JSON.stringify({ url, force_refresh: forceRefresh }),
  });

  if (!resp.ok) {
    let errorMessage = `HTTP ${resp.status}`;
    let errorDetails = '';
    try {
      const text = await resp.text();
      const errorJson = JSON.parse(text);
      errorMessage = errorJson.error || errorJson.message || text || errorMessage;
      errorDetails = errorJson.details || '';
    } catch {
      // keep fallback errorMessage
    }

    if (resp.status === 401) {
      throw new Error('Session expired. Please refresh the page and try again.');
    }

    if (errorDetails) {
      throw new Error(`${errorMessage}\n\nDetails: ${errorDetails}`);
    }

    throw new Error(errorMessage);
  }

  const result = await resp.json() as RegistryPreview;
  return result;
}

export async function publicFetchRegistryItems(weddingSiteId: string): Promise<RegistryItem[]> {
  const { data, error } = await supabase
    .from('registry_items')
    .select('*')
    .eq('wedding_site_id', weddingSiteId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as RegistryItem[];
}

export async function ownerMarkPurchased(
  itemId: string,
  incrementBy: number
): Promise<RegistryItem> {
  const { data: current, error: fetchErr } = await supabase
    .from('registry_items')
    .select('quantity_needed, quantity_purchased')
    .eq('id', itemId)
    .single();

  if (fetchErr) throw new Error(fetchErr.message);

  const newQty = Math.min(
    (current.quantity_purchased as number) + incrementBy,
    current.quantity_needed as number
  );
  const newStatus: string =
    newQty >= (current.quantity_needed as number) ? 'purchased' : newQty > 0 ? 'partial' : 'available';

  const { data, error } = await supabase
    .from('registry_items')
    .update({
      quantity_purchased: newQty,
      purchase_status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as RegistryItem;
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

  if (error) throw new Error(error.message);
  return data as RegistryItem;
}

export function findDuplicateItem(
  url: string,
  title: string | null,
  existingItems: RegistryItem[],
  excludeId?: string
): RegistryItem | null {
  const normalizedUrl = url.toLowerCase().trim();
  const normalizedTitle = title?.toLowerCase().trim();

  for (const item of existingItems) {
    if (excludeId && item.id === excludeId) continue;

    const itemCanonical = item.canonical_url?.toLowerCase().trim();
    const itemUrl = item.item_url?.toLowerCase().trim();
    const itemTitle = item.item_name.toLowerCase().trim();

    if (itemCanonical && itemCanonical === normalizedUrl) {
      return item;
    }

    if (itemUrl && itemUrl === normalizedUrl) {
      return item;
    }

    if (normalizedTitle && itemTitle === normalizedTitle) {
      return item;
    }
  }

  return null;
}
