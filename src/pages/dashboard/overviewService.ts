import { resolveActiveSiteForUser, type ActiveSiteSummary } from '../../lib/activeSite';
import { buildBudgetPaymentReview, type BudgetLedgerItem, type VendorLedgerItem } from '../../lib/budgetVendorLedgerReadiness';
import { supabase } from '../../lib/supabase';
import { buildAnalyticsEventSummary, buildEmptyAnalyticsEventSummary, type AnalyticsEventSummary } from './analyticsEventSummary';
import { normalizeAnalyticsSettings } from './settings/settingsDashboardUtils';

const OVERVIEW_DISMISSALS_SITE_SELECT = 'wedding_data';
const OVERVIEW_BUILDER_SITE_SELECT = 'site_json';
const OVERVIEW_DRAFT_REFRESH_SITE_SELECT = 'onboarding_answers, site_json, wedding_data';
const OVERVIEW_SITE_SELECT = 'id, site_slug, site_url, is_published, privacy_mode, site_json, published_json, notification_prefs, updated_at, template_id, wedding_data, onboarding_answers, couple_name_1, couple_name_2, venue_name, wedding_date, venue_date, wedding_location';
const OVERVIEW_INTERACTIVE_SUGGESTION_SELECT = 'id, suggestion_text, created_at';
const OVERVIEW_INTERACTIVE_VOTE_SELECT = 'id, widget_kind, widget_id, option_id, created_at';

export const MAX_OVERVIEW_RECENT_RSVPS = 5;
export const MAX_OVERVIEW_INTERACTIVE_SUGGESTIONS = 8;
export const MAX_OVERVIEW_INTERACTIVE_VOTES = 500;
export const MAX_OVERVIEW_COLLABORATOR_LINK_ROWS = 1;
export const MAX_OVERVIEW_BUDGET_ITEMS = 1000;
export const MAX_OVERVIEW_VENDORS = 500;
export const OVERVIEW_RECENT_UPLOAD_LOOKBACK_DAYS = 7;
export const OVERVIEW_GUEST_SELECT = 'id, rsvp_status, rsvp_received_at, first_name, last_name, name';
export const OVERVIEW_BUDGET_ITEM_SELECT = 'id, estimated_amount, actual_amount, paid_amount, vendor_id';
export const OVERVIEW_VENDOR_SELECT = 'id, name, email, contract_total, amount_paid, balance_due, next_payment_due, document_url';
export const OVERVIEW_GUEST_HUB_EVENT_SELECT = 'event_type, target, created_at';
export const OVERVIEW_ANALYTICS_LOOKBACK_DAYS = 30;

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
  privacy_mode?: string | null;
  site_json: Record<string, unknown> | null;
  published_json?: Record<string, unknown> | null;
  notification_prefs: Record<string, unknown> | null;
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
  messageReviewCount: number;
  upcomingTaskCount: number;
  upcomingPaymentCount: number;
  newPhotoUploadCount: number;
  seatingGapCount: number;
  recentRsvps: OverviewRecentRsvp[];
  analyticsEventSummary: AnalyticsEventSummary;
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
      messageReviewCount: 0,
      upcomingTaskCount: 0,
      upcomingPaymentCount: 0,
      newPhotoUploadCount: 0,
      seatingGapCount: 0,
      recentRsvps: [],
      analyticsEventSummary: buildEmptyAnalyticsEventSummary(OVERVIEW_ANALYTICS_LOOKBACK_DAYS),
    };
  }

  const siteId = site.id;
  const analyticsSettings = normalizeAnalyticsSettings(
    (site.wedding_data && typeof site.wedding_data === 'object'
      ? (site.wedding_data as Record<string, unknown>).analytics_settings
      : null),
  );
  const analyticsLookbackDays = analyticsSettings.retentionDays;
  const recentUploadCutoffIso = new Date(Date.now() - OVERVIEW_RECENT_UPLOAD_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

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
    messageReviewCountResult,
    upcomingTaskCountResult,
    budgetItemsResult,
    vendorsResult,
    recentUploadCountResult,
    seatingAttendingCountResult,
    seatingEventsResult,
    guestHubEventsResult,
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
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('wedding_site_id', siteId)
      .or('status.eq.failed,status.eq.partial,failed_count.gt.0'),
    supabase
      .from('planning_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('wedding_site_id', siteId)
      .in('status', ['todo', 'in_progress']),
    supabase
      .from('planning_budget_items')
      .select(OVERVIEW_BUDGET_ITEM_SELECT)
      .eq('wedding_site_id', siteId)
      .limit(MAX_OVERVIEW_BUDGET_ITEMS),
    supabase
      .from('planning_vendors')
      .select(OVERVIEW_VENDOR_SELECT)
      .eq('wedding_site_id', siteId)
      .limit(MAX_OVERVIEW_VENDORS),
    supabase
      .from('photo_uploads')
      .select('id', { count: 'exact', head: true })
      .eq('wedding_site_id', siteId)
      .eq('is_hidden', false)
      .gte('uploaded_at', recentUploadCutoffIso),
    supabase
      .from('guests')
      .select('id', { count: 'exact', head: true })
      .eq('wedding_site_id', siteId)
      .in('rsvp_status', ['confirmed', 'attending']),
    supabase
      .from('seating_events')
      .select('id')
      .eq('wedding_site_id', siteId),
    supabase
      .from('guest_hub_events')
      .select(OVERVIEW_GUEST_HUB_EVENT_SELECT)
      .eq('wedding_site_id', siteId)
      .gte('created_at', new Date(Date.now() - analyticsLookbackDays * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(5000),
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
  if (messageReviewCountResult.error) throw messageReviewCountResult.error;
  if (upcomingTaskCountResult.error) throw upcomingTaskCountResult.error;
  if (budgetItemsResult.error) throw budgetItemsResult.error;
  if (vendorsResult.error) throw vendorsResult.error;
  if (recentUploadCountResult.error) throw recentUploadCountResult.error;
  if (seatingAttendingCountResult.error) throw seatingAttendingCountResult.error;
  if (seatingEventsResult.error) throw seatingEventsResult.error;
  if (guestHubEventsResult.error) throw guestHubEventsResult.error;

  const paymentReview = buildBudgetPaymentReview({
    budgetItems: ((budgetItemsResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id ?? ''),
      category: '',
      item_name: '',
      estimated_amount: typeof row.estimated_amount === 'number' ? row.estimated_amount : null,
      actual_amount: typeof row.actual_amount === 'number' ? row.actual_amount : null,
      paid_amount: typeof row.paid_amount === 'number' ? row.paid_amount : null,
      due_date: null,
      vendor_id: typeof row.vendor_id === 'string' ? row.vendor_id : null,
    })) as BudgetLedgerItem[],
    vendors: ((vendorsResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id ?? ''),
      name: typeof row.name === 'string' ? row.name : '',
      email: typeof row.email === 'string' ? row.email : null,
      phone: null,
      contract_total: typeof row.contract_total === 'number' ? row.contract_total : null,
      amount_paid: typeof row.amount_paid === 'number' ? row.amount_paid : null,
      balance_due: typeof row.balance_due === 'number' ? row.balance_due : null,
      next_payment_due: typeof row.next_payment_due === 'string' ? row.next_payment_due : null,
      document_url: typeof row.document_url === 'string' ? row.document_url : null,
    })) as VendorLedgerItem[],
  });

  let seatingGapCount = 0;
  const seatingEventIds = (seatingEventsResult.data ?? []).map((row) => String((row as { id: string }).id)).filter(Boolean);
  if (seatingEventIds.length > 0) {
    const { count: seatedCount, error: seatingAssignmentsError } = await supabase
      .from('seating_assignments')
      .select('id', { count: 'exact', head: true })
      .in('seating_event_id', seatingEventIds)
      .eq('is_valid', true);
    if (seatingAssignmentsError) throw seatingAssignmentsError;
    seatingGapCount = Math.max(0, (seatingAttendingCountResult.count ?? 0) - (seatedCount ?? 0));
  } else {
    seatingGapCount = seatingAttendingCountResult.count ?? 0;
  }

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
    messageReviewCount: messageReviewCountResult.count ?? 0,
    upcomingTaskCount: upcomingTaskCountResult.count ?? 0,
    upcomingPaymentCount: paymentReview.overdueCount + paymentReview.dueSoonCount,
    newPhotoUploadCount: recentUploadCountResult.count ?? 0,
    seatingGapCount,
    recentRsvps: formatRecentRsvps((recentRsvpsResult.data ?? []) as OverviewRecentRsvpRow[]),
    analyticsEventSummary: buildAnalyticsEventSummary((guestHubEventsResult.data ?? []) as Array<{ event_type: string | null; target: string | null; created_at: string | null }>, {
      lookbackDays: analyticsLookbackDays,
    }),
  };
}
