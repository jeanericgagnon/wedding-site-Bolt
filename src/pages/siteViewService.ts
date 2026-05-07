import { supabase } from '../lib/supabase';

export interface PublicItineraryRow {
  id?: string;
  event_name?: string;
  title?: string;
  description?: string;
  notes?: string | null;
  event_date?: string;
  start_time?: string | null;
  end_time?: string | null;
  location_name?: string | null;
  location_address?: string | null;
  is_visible?: boolean | null;
}

export async function fetchPublicItineraryRows(
  siteSlug: string,
  access: { inviteToken?: string | null; passwordSession?: string | null } = {},
): Promise<PublicItineraryRow[]> {
  const { data: fnData, error: fnError } = await supabase.functions.invoke('public-itinerary-by-slug', {
    body: {
      slug: siteSlug,
      inviteToken: access.inviteToken ?? null,
      passwordSession: access.passwordSession ?? null,
    },
  });

  if (!fnError && Array.isArray(fnData?.events)) {
    return fnData.events as PublicItineraryRow[];
  }

  return [];
}

export async function hasLiveRegistryItems(
  siteId: string,
  access: { inviteToken?: string | null; passwordSession?: string | null } = {},
): Promise<boolean> {
  try {
    const { data: fnData } = await supabase.functions.invoke('public-registry-items', {
      body: {
        wedding_site_id: siteId,
        limit: 1,
        inviteToken: access.inviteToken ?? null,
        passwordSession: access.passwordSession ?? null,
      },
    });
    if (Array.isArray(fnData?.items)) return fnData.items.length > 0;
    return false;
  } catch {
    return false;
  }
}
