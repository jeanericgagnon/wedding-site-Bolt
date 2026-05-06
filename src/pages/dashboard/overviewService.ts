import { supabase } from '../../lib/supabase';
import { resolveActiveSiteForUser, type ActiveSiteSummary } from '../../lib/activeSite';

const OVERVIEW_DISMISSALS_SITE_SELECT = 'wedding_data';
export const OVERVIEW_SITE_SELECT = 'id, site_slug, site_url, is_published, site_json, updated_at, template_id, wedding_data, onboarding_answers, couple_name_1, couple_name_2, venue_name, wedding_date, venue_date, wedding_location';
export const OVERVIEW_GUEST_SELECT = 'id, rsvp_status, rsvp_received_at, first_name, last_name, name, email, phone';
export const OVERVIEW_DRAFT_SOURCE_SELECT = 'onboarding_answers, site_json, wedding_data';
export const OVERVIEW_BUILDER_SITE_JSON_SELECT = 'site_json';
export const OVERVIEW_INTERACTIVE_SUGGESTION_SELECT = 'id, suggestion_text, created_at';
export const OVERVIEW_INTERACTIVE_VOTE_SELECT = 'id, widget_kind, widget_id, option_id, created_at';
const MAX_OVERVIEW_GUESTS = 2000;

export interface OverviewSiteRow {
  id: string;
  site_slug: string | null;
  site_url: string | null;
  is_published: boolean | null;
  site_json: Record<string, unknown> | null;
  updated_at: string | null;
  template_id: string | null;
  wedding_data: Record<string, unknown> | null;
  onboarding_answers: unknown;
  couple_name_1: string | null;
  couple_name_2: string | null;
  venue_name: string | null;
  wedding_date: string | null;
  venue_date: string | null;
  wedding_location: string | null;
}

export interface OverviewGuestRow {
  id: string;
  rsvp_status: string | null;
  rsvp_received_at: string | null;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
}

export interface OverviewDraftSourceRow {
  onboarding_answers: unknown;
  site_json: Record<string, unknown> | null;
  wedding_data: Record<string, unknown> | null;
}

export interface OverviewInteractiveSuggestionRow {
  id: string;
  suggestion_text: string;
  created_at: string;
}

export interface OverviewInteractiveVoteRow {
  id: string;
  widget_kind: 'poll' | 'quiz';
  widget_id: string;
  option_id: string;
  created_at: string;
}

export interface OverviewCounts {
  registryItemCount: number;
  photoAlbumCount: number;
  activePhotoAlbumCount: number;
  vaultCount: number;
  enabledVaultCount: number;
}

export interface OverviewActiveSiteResult {
  activeSite: ActiveSiteSummary | null;
  site: OverviewSiteRow | null;
}

export function buildUserEditedSiteJson(
  siteJson: Record<string, unknown> | null,
  fieldPath: string,
  updatedAt: string,
): Record<string, unknown> {
  const nextSiteJson = structuredClone(siteJson ?? {});
  const segments = fieldPath.split('.').filter(Boolean);
  if (segments.length === 0) return nextSiteJson;

  let cursor: Record<string, unknown> = nextSiteJson;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const key = segments[i];
    cursor[key] = ((cursor[key] as Record<string, unknown> | undefined) ?? {});
    cursor = cursor[key] as Record<string, unknown>;
  }

  const leaf = segments[segments.length - 1];
  const current = cursor[leaf];
  if (current && typeof current === 'object' && 'value' in (current as Record<string, unknown>)) {
    cursor[leaf] = {
      ...(current as Record<string, unknown>),
      source: 'user-edited',
      updatedAt,
    };
  }

  return nextSiteJson;
}

export async function markOverviewBuilderFieldAsUserEdited(siteId: string, fieldPath: string): Promise<void> {
  const { data, error } = await supabase
    .from('wedding_sites')
    .select(OVERVIEW_BUILDER_SITE_JSON_SELECT)
    .eq('id', siteId)
    .maybeSingle();

  if (error) throw error;

  const nextSiteJson = buildUserEditedSiteJson(
    (data?.site_json as Record<string, unknown> | null) ?? {},
    fieldPath,
    new Date().toISOString(),
  );

  const { error: updateError } = await supabase
    .from('wedding_sites')
    .update({ site_json: nextSiteJson })
    .eq('id', siteId);

  if (updateError) throw updateError;
}

export async function loadOverviewDraftSource(siteId: string): Promise<OverviewDraftSourceRow | null> {
  const { data, error } = await supabase
    .from('wedding_sites')
    .select(OVERVIEW_DRAFT_SOURCE_SELECT)
    .eq('id', siteId)
    .maybeSingle();

  if (error) throw error;
  return (data as OverviewDraftSourceRow | null) ?? null;
}

export async function updateOverviewDraftFromBrief(
  siteId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from('wedding_sites')
    .update(patch)
    .eq('id', siteId);

  if (error) throw error;
}

export async function loadOverviewActiveSite(userId: string): Promise<OverviewActiveSiteResult> {
  const activeSite = await resolveActiveSiteForUser(userId);
  if (!activeSite?.id) {
    return { activeSite: null, site: null };
  }

  const { data, error } = await supabase
    .from('wedding_sites')
    .select(OVERVIEW_SITE_SELECT)
    .eq('id', activeSite.id)
    .maybeSingle();

  if (error) throw error;
  return {
    activeSite,
    site: (data as OverviewSiteRow | null) ?? null,
  };
}

export async function loadOverviewGuests(siteId: string | null | undefined): Promise<OverviewGuestRow[]> {
  if (!siteId) return [];

  const { data, error } = await supabase
    .from('guests')
    .select(OVERVIEW_GUEST_SELECT)
    .eq('wedding_site_id', siteId)
    .order('rsvp_received_at', { ascending: false })
    .limit(MAX_OVERVIEW_GUESTS);

  if (error) throw error;
  return (data ?? []) as OverviewGuestRow[];
}

async function countRows(
  table: 'registry_items' | 'photo_albums' | 'vault_configs',
  siteId: string | null | undefined,
  filter?: { column: string; value: boolean },
): Promise<number> {
  if (!siteId) return 0;

  let query = supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('wedding_site_id', siteId);

  if (filter) {
    query = query.eq(filter.column, filter.value);
  }

  const { count } = await query;
  return count ?? 0;
}

export async function loadOverviewCounts(siteId: string | null | undefined): Promise<OverviewCounts> {
  const [
    registryItemCount,
    photoAlbumCount,
    activePhotoAlbumCount,
    vaultCount,
    enabledVaultCount,
  ] = await Promise.all([
    countRows('registry_items', siteId),
    countRows('photo_albums', siteId),
    countRows('photo_albums', siteId, { column: 'is_active', value: true }),
    countRows('vault_configs', siteId),
    countRows('vault_configs', siteId, { column: 'is_enabled', value: true }),
  ]);

  return {
    registryItemCount,
    photoAlbumCount,
    activePhotoAlbumCount,
    vaultCount,
    enabledVaultCount,
  };
}

export async function loadOverviewInteractiveActivity(siteSlug: string): Promise<{
  suggestions: OverviewInteractiveSuggestionRow[];
  votes: OverviewInteractiveVoteRow[];
}> {
  const [suggestionsResult, votesResult] = await Promise.all([
    supabase
      .from('interactive_suggestions')
      .select(OVERVIEW_INTERACTIVE_SUGGESTION_SELECT)
      .eq('site_slug', siteSlug)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('interactive_votes')
      .select(OVERVIEW_INTERACTIVE_VOTE_SELECT)
      .eq('site_slug', siteSlug)
      .order('created_at', { ascending: false })
      .limit(500),
  ]);

  return {
    suggestions: suggestionsResult.error ? [] : (suggestionsResult.data ?? []) as OverviewInteractiveSuggestionRow[],
    votes: votesResult.error ? [] : (votesResult.data ?? []) as OverviewInteractiveVoteRow[],
  };
}

export function buildOverviewDismissalsWeddingData(
  weddingData: Record<string, unknown> | null,
  dismissedIds: string[],
): Record<string, unknown> {
  const current = weddingData ?? {};
  const meta = (current.meta as Record<string, unknown> | undefined) ?? {};
  return {
    ...current,
    meta: {
      ...meta,
      intelligenceDismissals: dismissedIds,
    },
  };
}

export async function persistOverviewIntelligenceDismissals(siteId: string, dismissedIds: string[]): Promise<void> {
  const { data, error } = await supabase
    .from('wedding_sites')
    .select(OVERVIEW_DISMISSALS_SITE_SELECT)
    .eq('id', siteId)
    .maybeSingle();

  if (error) throw error;

  const nextWeddingData = buildOverviewDismissalsWeddingData(
    (data?.wedding_data as Record<string, unknown> | null) ?? {},
    dismissedIds,
  );

  const { error: updateError } = await supabase
    .from('wedding_sites')
    .update({ wedding_data: nextWeddingData })
    .eq('id', siteId);

  if (updateError) throw updateError;
}

export async function hideInteractiveSuggestion(id: string): Promise<void> {
  const { error } = await supabase
    .from('interactive_suggestions')
    .update({ is_hidden: true })
    .eq('id', id);

  if (error) throw error;
}
