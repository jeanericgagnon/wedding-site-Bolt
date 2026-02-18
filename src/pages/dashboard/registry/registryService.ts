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

export async function fetchUrlPreview(url: string): Promise<RegistryPreview> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const endpoint = `${supabaseUrl}/functions/v1/registry-preview`;

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? anonKey;

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Apikey: anonKey,
    },
    body: JSON.stringify({ url }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `HTTP ${resp.status}`);
  }

  return resp.json() as Promise<RegistryPreview>;
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
