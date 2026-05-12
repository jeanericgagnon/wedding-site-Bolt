import { resolveActiveSiteForUser, type ActiveSiteSummary } from '../../lib/activeSite';
import { supabase } from '../../lib/supabase';

const OVERVIEW_DISMISSALS_SITE_SELECT = 'wedding_data';
const OVERVIEW_BUILDER_SITE_SELECT = 'site_json';
const OVERVIEW_DRAFT_REFRESH_SITE_SELECT = 'onboarding_answers, site_json, wedding_data';
const OVERVIEW_SITE_SELECT = 'id, site_slug, site_url, is_published, site_json, updated_at, template_id, wedding_data, onboarding_answers, couple_name_1, couple_name_2, venue_name, wedding_date, venue_date, wedding_location';
const OVERVIEW_INTERACTIVE_SUGGESTION_SELECT = 'id, suggestion_text, created_at';
const OVERVIEW_INTERACTIVE_VOTE_SELECT = 'id, widget_kind, widget_id, option_id, created_at';

export const MAX_OVERVIEW_RECENT_RSVPS = 5;
export const MAX_OVERVIEW_INTERACTIVE_SUGGESTIONS = 8;
export const MAX_OVERVIEW_INTERACTIVE_VOTES = 500;
export const MAX_OVERVIEW_COLLABORATOR_LINK_ROWS = 1;
export const OVERVIEW_GUEST_SELECT = 'id, rsvp_status, rsvp_received_at, first_name, last_name, name';

export interface OverviewInteractiveSuggestion {
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

export interface OverviewInteractiveVoteSummary {
  key: string;
  widgetKind: 'poll' | 'quiz';
  widgetId: string;
  total: number;
  latestAt: string;
  options: Array<{ optionId: string; count: number; percentage: number }>;
}

export interface OverviewRecentRsvp {
  id: string;
  guestName: string;
  status: 'confirmed' | 'declined' | 'accepted' | 'attending' | 'not_attending';
  receivedAt: string;
}

export interface OverviewSiteRecord {
  id: string;
  site_slug: string | null;
  site_url: string | null;
  is_published: boolean | null;
  site_json: Record<string, unknown> | null;
  updated_at: string | null;
  template_id: string | null;
  wedding_data: Record<string, unknown> | null;
  onboarding_answers: Record<string, unknown> | null;
  couple_name_1: string | null;
  couple_name_2: string | null;
  venue_name: string | null;
  wedding_date: string | null;
  venue_date: string | null;
  wedding_location: string | null;
}

export interface OverviewDashboardSnapshot {
  activeSite: ActiveSiteSummary | null;
  site: OverviewSiteRecord | null;
  totalGuests: number;
  confirmedGuests: number;
  declinedGuests: number;
  pendingGuests: number;
  contactableGuestCount: number;
  registryItemCount: number;
  photoAlbumCount: number;
  activePhotoAlbumCount: number;
  vaultCount: number;
  enabledVaultCount: number;
  recentRsvps: OverviewRecentRsvp[];
}

export interface OverviewDraftRefreshSeed {
  onboardingAnswers: Record<string, unknown> | null;
  siteJson: Record<string, unknown> | null;
  weddingData: Record<string, unknown> | null;
}

type OverviewRecentRsvpRow = {
  id: string;
  rsvp_status: OverviewRecentRsvp['status'];
  rsvp_received_at: string | null;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
};

function summarizeInteractiveVotes(rows: OverviewInteractiveVoteRow[]): OverviewInteractiveVoteSummary[] {
  const grouped = rows.reduce<Record<string, { widgetKind: 'poll' | 'quiz'; widgetId: string; latestAt: string; counts: Record<string, number> }>>((acc, row) => {
    const key = `${row.widget_kind}:${row.widget_id}`;
    const current = acc[key] ?? {
      widgetKind: row.widget_kind,
      widgetId: row.widget_id,
      latestAt: row.created_at,
      counts: {},
    };
    current.latestAt = new Date(row.created_at).getTime() > new Date(current.latestAt).getTime() ? row.created_at : current.latestAt;
    current.counts[row.option_id] = (current.counts[row.option_id] ?? 0) + 1;
    acc[key] = current;
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([key, group]) => {
      const total = Object.values(group.counts).reduce((sum, count) => sum + count, 0);
      return {
        key,
        widgetKind: group.widgetKind,
        widgetId: group.widgetId,
        total,
        latestAt: group.latestAt,
        options: Object.entries(group.counts)
          .map(([optionId, count]) => ({
            optionId,
            count,
            percentage: total > 0 ? Math.round((count / total) * 100) : 0,
          }))
          .sort((a, b) => b.count - a.count),
      };
    })
    .sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
}

function formatRecentRsvps(rows: OverviewRecentRsvpRow[]): OverviewRecentRsvp[] {
  return rows.map((guest) => ({
    id: guest.id,
    guestName: guest.name || `${guest.first_name ?? ''} ${guest.last_name ?? ''}`.trim() || 'Guest',
    status: guest.rsvp_status,
    receivedAt: guest.rsvp_received_at || '',
  }));
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

  const { error: updateError } = await supabase.rpc('wedding_site_settings_patch', {
    p_wedding_site_id: siteId,
    p_patch: { wedding_data: nextWeddingData },
  });

  if (updateError) throw updateError;
}

export async function hideInteractiveSuggestion(id: string): Promise<void> {
  const { error } = await supabase.rpc('overview_interactive_suggestion_hide', {
    p_suggestion_id: id,
  });

  if (error) throw error;
}

export async function loadOverviewInteractiveData(siteSlug: string): Promise<{
  suggestions: OverviewInteractiveSuggestion[];
  voteSummaries: OverviewInteractiveVoteSummary[];
}> {
  const [suggestionsResult, votesResult] = await Promise.all([
    supabase
      .from('interactive_suggestions')
      .select(OVERVIEW_INTERACTIVE_SUGGESTION_SELECT)
      .eq('site_slug', siteSlug)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(MAX_OVERVIEW_INTERACTIVE_SUGGESTIONS),
    supabase
      .from('interactive_votes')
      .select(OVERVIEW_INTERACTIVE_VOTE_SELECT)
      .eq('site_slug', siteSlug)
      .order('created_at', { ascending: false })
      .limit(MAX_OVERVIEW_INTERACTIVE_VOTES),
  ]);

  if (suggestionsResult.error) throw suggestionsResult.error;
  if (votesResult.error) throw votesResult.error;

  return {
    suggestions: (suggestionsResult.data ?? []) as OverviewInteractiveSuggestion[],
    voteSummaries: summarizeInteractiveVotes((votesResult.data ?? []) as OverviewInteractiveVoteRow[]),
  };
}

export async function markOverviewBuilderFieldAsUserEdited(siteId: string, fieldPath: string): Promise<void> {
  const { data, error } = await supabase
    .from('wedding_sites')
    .select(OVERVIEW_BUILDER_SITE_SELECT)
    .eq('id', siteId)
    .maybeSingle();

  if (error) throw error;

  const nextSiteJson = structuredClone((data?.site_json as Record<string, unknown> | null) ?? {});
  const segments = fieldPath.split('.');
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
      updatedAt: new Date().toISOString(),
    };
  }

  const { error: updateError } = await supabase.rpc('wedding_site_settings_patch', {
    p_wedding_site_id: siteId,
    p_patch: { site_json: nextSiteJson },
  });

  if (updateError) throw updateError;
}

export async function loadOverviewDraftRefreshSeed(siteId: string): Promise<OverviewDraftRefreshSeed> {
  const { data, error } = await supabase
    .from('wedding_sites')
    .select(OVERVIEW_DRAFT_REFRESH_SITE_SELECT)
    .eq('id', siteId)
    .maybeSingle();

  if (error) throw error;

  return {
    onboardingAnswers: (data?.onboarding_answers as Record<string, unknown> | null) ?? null,
    siteJson: (data?.site_json as Record<string, unknown> | null) ?? null,
    weddingData: (data?.wedding_data as Record<string, unknown> | null) ?? null,
  };
}

export async function updateOverviewDraftRefresh(
  siteId: string,
  patch: {
    wedding_data: Record<string, unknown>;
    site_json: Record<string, unknown>;
  } & Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.rpc('wedding_site_settings_patch', {
    p_wedding_site_id: siteId,
    p_patch: patch,
  });

  if (error) throw error;
}

async function loadOverviewSite(userId: string, activeSiteId: string | null): Promise<OverviewSiteRecord | null> {
  let site: OverviewSiteRecord | null = null;

  if (activeSiteId) {
    const { data: ownedSite, error: siteError } = await supabase
      .from('wedding_sites')
      .select(OVERVIEW_SITE_SELECT)
      .eq('id', activeSiteId)
      .maybeSingle();

    if (siteError) throw siteError;
    site = (ownedSite as OverviewSiteRecord | null) ?? null;
  }

  if (!site) {
    const { data: collaboratorLink, error: collaboratorError } = await supabase
      .from('wedding_site_collaborators')
      .select('wedding_site_id')
      .eq('user_id', userId)
      .limit(MAX_OVERVIEW_COLLABORATOR_LINK_ROWS)
      .maybeSingle();

    if (collaboratorError) throw collaboratorError;

    if (collaboratorLink?.wedding_site_id) {
      const { data: collaboratorSite, error: collaboratorSiteError } = await supabase
        .from('wedding_sites')
        .select(OVERVIEW_SITE_SELECT)
        .eq('id', collaboratorLink.wedding_site_id)
        .maybeSingle();

      if (collaboratorSiteError) throw collaboratorSiteError;
      site = (collaboratorSite as OverviewSiteRecord | null) ?? null;
    }
  }

  return site;
}

export async function loadOverviewDashboardSnapshot(userId: string): Promise<OverviewDashboardSnapshot> {
  const activeSite = await resolveActiveSiteForUser(userId);
  const site = await loadOverviewSite(userId, activeSite?.id ?? null);

  if (!site?.id) {
    return {
      activeSite,
      site,
      totalGuests: 0,
      confirmedGuests: 0,
      declinedGuests: 0,
      pendingGuests: 0,
      contactableGuestCount: 0,
      registryItemCount: 0,
      photoAlbumCount: 0,
      activePhotoAlbumCount: 0,
      vaultCount: 0,
      enabledVaultCount: 0,
      recentRsvps: [],
    };
  }

  const siteId = site.id;

  const [
    totalGuestsResult,
    confirmedGuestsResult,
    declinedGuestsResult,
    pendingGuestsResult,
    contactableGuestsResult,
    recentRsvpsResult,
    registryItemCountResult,
    photoAlbumCountResult,
    activePhotoAlbumCountResult,
    vaultCountResult,
    enabledVaultCountResult,
  ] = await Promise.all([
    supabase
      .from('guests')
      .select('id', { count: 'exact', head: true })
      .eq('wedding_site_id', siteId),
    supabase
      .from('guests')
      .select('id', { count: 'exact', head: true })
      .eq('wedding_site_id', siteId)
      .in('rsvp_status', ['confirmed', 'attending', 'accepted']),
    supabase
      .from('guests')
      .select('id', { count: 'exact', head: true })
      .eq('wedding_site_id', siteId)
      .in('rsvp_status', ['declined', 'not_attending']),
    supabase
      .from('guests')
      .select('id', { count: 'exact', head: true })
      .eq('wedding_site_id', siteId)
      .or('rsvp_status.is.null,rsvp_status.eq.pending'),
    supabase
      .from('guests')
      .select('id', { count: 'exact', head: true })
      .eq('wedding_site_id', siteId)
      .or('email.not.is.null,phone.not.is.null'),
    supabase
      .from('guests')
      .select(OVERVIEW_GUEST_SELECT)
      .eq('wedding_site_id', siteId)
      .in('rsvp_status', ['confirmed', 'attending', 'accepted', 'declined', 'not_attending'])
      .not('rsvp_received_at', 'is', null)
      .order('rsvp_received_at', { ascending: false })
      .limit(MAX_OVERVIEW_RECENT_RSVPS),
    supabase
      .from('registry_items')
      .select('id', { count: 'exact', head: true })
      .eq('wedding_site_id', siteId),
    supabase
      .from('photo_albums')
      .select('id', { count: 'exact', head: true })
      .eq('wedding_site_id', siteId),
    supabase
      .from('photo_albums')
      .select('id', { count: 'exact', head: true })
      .eq('wedding_site_id', siteId)
      .eq('is_active', true),
    supabase
      .from('vault_configs')
      .select('id', { count: 'exact', head: true })
      .eq('wedding_site_id', siteId),
    supabase
      .from('vault_configs')
      .select('id', { count: 'exact', head: true })
      .eq('wedding_site_id', siteId)
      .eq('is_enabled', true),
  ]);

  if (totalGuestsResult.error) throw totalGuestsResult.error;
  if (confirmedGuestsResult.error) throw confirmedGuestsResult.error;
  if (declinedGuestsResult.error) throw declinedGuestsResult.error;
  if (pendingGuestsResult.error) throw pendingGuestsResult.error;
  if (contactableGuestsResult.error) throw contactableGuestsResult.error;
  if (recentRsvpsResult.error) throw recentRsvpsResult.error;
  if (registryItemCountResult.error) throw registryItemCountResult.error;
  if (photoAlbumCountResult.error) throw photoAlbumCountResult.error;
  if (activePhotoAlbumCountResult.error) throw activePhotoAlbumCountResult.error;
  if (vaultCountResult.error) throw vaultCountResult.error;
  if (enabledVaultCountResult.error) throw enabledVaultCountResult.error;

  return {
    activeSite,
    site,
    totalGuests: totalGuestsResult.count ?? 0,
    confirmedGuests: confirmedGuestsResult.count ?? 0,
    declinedGuests: declinedGuestsResult.count ?? 0,
    pendingGuests: pendingGuestsResult.count ?? 0,
    contactableGuestCount: contactableGuestsResult.count ?? 0,
    registryItemCount: registryItemCountResult.count ?? 0,
    photoAlbumCount: photoAlbumCountResult.count ?? 0,
    activePhotoAlbumCount: activePhotoAlbumCountResult.count ?? 0,
    vaultCount: vaultCountResult.count ?? 0,
    enabledVaultCount: enabledVaultCountResult.count ?? 0,
    recentRsvps: formatRecentRsvps((recentRsvpsResult.data ?? []) as OverviewRecentRsvpRow[]),
  };
}
