import { demoGuests, demoWeddingSite } from '../../lib/demoData';
import { resolvePublicSiteSlugFromRow } from '../../lib/publicSiteSlug';
import { getWeddingProfileRefineTargets, getWeddingProfileSummary, isWeddingProfile } from '../../lib/weddingProfile';
import { calcOverviewDaysUntil } from './overviewDate';
import { getOverviewFallbackCoupleValue } from './overviewDraftBrief';
import { buildNameChangeOverviewInsights, type NameChangeOverviewInsights } from './nameChangeOverviewInsights';
import { deriveNameChangeLifecycleStatus } from './nameChangeLifecycleStatus';
import { hydrateNameChangeWorkspace } from './planning/nameChangeService';
import { isAttendingRsvpStatus, isDeclinedRsvpStatus, isPendingRsvpStatus } from '../../lib/rsvpStatus';
import type { PlannerAccessRole, PlannerPermissionKey } from '../../lib/plannerAccess';
import type { NotificationPrefs } from '../../lib/notificationPrefs';
import type { AnalyticsEventSummary } from './analyticsEventSummary';
import { normalizeAnalyticsSettings } from './settings/settingsDashboardUtils';

type RecentRsvp = {
  id: string;
  guestName: string;
  status: 'confirmed' | 'declined' | 'accepted' | 'attending' | 'not_attending';
  receivedAt: string;
};

type DraftBriefItem = { id: string; label: string; value: string; questionKey: string };
type DraftRefineTarget = { id: string; label: string; questionIndex: number; value: string };

export interface OverviewStatsState {
  siteId: string | null;
  publishedVersion: number | null;
  lastPublishedAt: string | null;
  totalGuests: number;
  confirmedGuests: number;
  declinedGuests: number;
  pendingGuests: number;
  daysUntilWedding: number | null;
  weddingDate: string | null;
  siteSlug: string | null;
  isPublished: boolean;
  privacyMode: 'public' | 'password_protected' | 'invite_only';
  hideFromSearch: boolean;
  siteUpdatedAt: string | null;
  templateName: string | null;
  coupleName1: string | null;
  coupleName2: string | null;
  venueName: string | null;
  venueLocation: string | null;
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
  contactableGuestCount: number;
  recentRsvps: RecentRsvp[];
  analyticsEventSummary: AnalyticsEventSummary;
  analyticsEnabled: boolean;
  analyticsRetentionDays: 30 | 90 | 180;
  analyticsGuestNotice: string;
  activeSiteRole: PlannerAccessRole;
  activeSitePermissions: PlannerPermissionKey[] | null;
  notificationPrefs: NotificationPrefs;
}

export interface NameChangeOverviewStateValue {
  hasWorkspace: boolean;
  workflowStatus: 'draft' | 'ready' | 'in_progress' | 'complete' | null;
  hasExecutionActivity: boolean;
}

export const DEFAULT_NAME_CHANGE_INSIGHTS: NameChangeOverviewInsights = {
  coreChainLabel: 'Certificate, SSA, and DMV stay together so the legal identity chain does not drift.',
  followOnLabel: 'Passport, payroll, and tax updates should reflect the same verified name once the first chain lands.',
  downstreamLabel: 'Use the long-tail rollout lane for banks, insurance, travel, loyalty, and the rest of the account cleanup.',
  downstreamHref: '/dashboard/planning?tab=nameChange#name-change-roadmap',
  concreteResumeLabel: null,
  milestoneSummaryHref: '/dashboard/planning?tab=nameChange#name-change-roadmap',
  milestoneSummaryLabel: 'Milestones ready to confirm',
  reminderSummaryHref: '/dashboard/planning?tab=nameChange#name-change-roadmap',
  reminderSummaryLabel: 'No open reminders',
};

export function resolveWeddingDateFromData(
  weddingData: Record<string, unknown> | null,
  site: { wedding_date?: string | null; venue_date?: string | null } | null
): string | null {
  const event = (weddingData?.event as Record<string, unknown> | undefined) ?? undefined;
  const eventWeddingDateISO = typeof event?.weddingDateISO === 'string' ? event.weddingDateISO : null;
  const legacyWeddingDate = typeof weddingData?.weddingDate === 'string' ? (weddingData.weddingDate as string) : null;
  return eventWeddingDateISO ?? legacyWeddingDate ?? site?.wedding_date ?? site?.venue_date ?? null;
}

export function buildDemoOverviewSnapshotState(): {
  stats: OverviewStatsState;
  nameChangeInsights: NameChangeOverviewInsights;
  nameChangeOverviewState: NameChangeOverviewStateValue;
} {
  const confirmed = demoGuests.filter((guest) => isAttendingRsvpStatus(guest.rsvp_status));
  const declined = demoGuests.filter((guest) => isDeclinedRsvpStatus(guest.rsvp_status));
  const pending = demoGuests.filter((guest) => isPendingRsvpStatus(guest.rsvp_status));
  const recentRsvps: RecentRsvp[] = [...confirmed, ...declined]
    .slice(0, 5)
    .map((guest, index) => ({
      id: guest.id,
      guestName: guest.name || `${guest.first_name ?? ''} ${guest.last_name ?? ''}`.trim() || 'Guest',
      status: guest.rsvp_status as RecentRsvp['status'],
      receivedAt: new Date(Date.now() - index * 60 * 60 * 1000).toISOString(),
    }));
  const weddingDate = demoWeddingSite.wedding_date ?? null;

  return {
    stats: {
      siteId: demoWeddingSite.id,
      publishedVersion: 1,
      lastPublishedAt: new Date().toISOString(),
      totalGuests: demoGuests.length,
      confirmedGuests: confirmed.length,
      declinedGuests: declined.length,
      pendingGuests: pending.length,
      daysUntilWedding: calcOverviewDaysUntil(weddingDate),
      weddingDate,
      siteSlug: resolvePublicSiteSlugFromRow(demoWeddingSite as unknown as Record<string, unknown>),
      isPublished: true,
      privacyMode: 'public',
      hideFromSearch: false,
      siteUpdatedAt: new Date().toISOString(),
      templateName: 'classic',
      coupleName1: demoWeddingSite.couple_name_1,
      coupleName2: demoWeddingSite.couple_name_2,
      venueName: demoWeddingSite.venue_name,
      venueLocation: demoWeddingSite.venue_location,
      registryItemCount: 2,
      photoAlbumCount: 3,
      activePhotoAlbumCount: 2,
      vaultCount: 3,
      enabledVaultCount: 3,
      messageReviewCount: 1,
      upcomingTaskCount: 4,
      upcomingPaymentCount: 2,
      newPhotoUploadCount: 5,
      seatingGapCount: 2,
      contactableGuestCount: demoGuests.filter((guest) => Boolean(guest.email)).length,
      recentRsvps,
      analyticsEventSummary: {
        lookbackDays: 30,
        totalTrackedEvents: 33,
        pageViews: 18,
        siteVisits: 8,
        inviteOpens: 6,
        qrScans: 4,
        recapViews: 2,
        totalClicks: 11,
        rsvpClicks: 4,
        registryClicks: 2,
        photoClicks: 3,
        travelClicks: 1,
        scheduleClicks: 1,
        guestbookClicks: 0,
        vaultClicks: 0,
        contactClicks: 0,
        lastTrackedAt: new Date().toISOString(),
      },
      analyticsEnabled: true,
      analyticsRetentionDays: 90,
      analyticsGuestNotice: 'Aggregate visit, invite, and QR counts help us see what guest resources are being used.',
      activeSiteRole: 'owner',
      activeSitePermissions: null,
      notificationPrefs: {
        digest: false,
        digestCadence: 'paused',
        digestIncludePlanner: false,
        digestQuietUntilLabel: null,
        digestNextDeliveryAt: null,
        digestLastReviewedAt: null,
        digestLastDeliveredAt: null,
        photos: true,
        rsvp: true,
        updates: false,
      },
    },
    nameChangeOverviewState: { hasWorkspace: true, workflowStatus: 'in_progress', hasExecutionActivity: true },
    nameChangeInsights: {
      coreChainLabel: '1 complete · 1 in progress across the legal identity chain.',
      followOnLabel: '1 milestone confirmed so passport, payroll, and tax follow-ons can stay in sync.',
      downstreamLabel: '2 reminders still open for the long-tail bank, insurance, travel, and loyalty cleanup.',
      downstreamHref: '/dashboard/planning?tab=nameChange#target-status-tracking',
      concreteResumeLabel: 'Review the next milestone',
      milestoneSummaryHref: '/dashboard/planning?tab=nameChange#target-status-tracking',
      milestoneSummaryLabel: '1 milestone confirmed',
      reminderSummaryHref: '/dashboard/planning?tab=nameChange#target-status-tracking',
      reminderSummaryLabel: '2 reminders open',
    },
  };
}

export function buildOverviewSiteDraftState(site: {
  onboarding_answers?: unknown;
  wedding_data?: unknown;
  couple_name_1?: string | null;
  couple_name_2?: string | null;
  wedding_date?: string | null;
  venue_name?: string | null;
  wedding_location?: string | null;
  template_id?: string | null;
  venue_date?: string | null;
} | null): {
  draftBrief: DraftBriefItem[];
  draftBriefDebug: string;
  draftRefineTargets: DraftRefineTarget[];
  persistedDismissals: string[];
  templateName: string | null;
  weddingDate: string | null;
} {
  if (!site) {
    return {
      draftBrief: [],
      draftBriefDebug: 'init',
      draftRefineTargets: [],
      persistedDismissals: [],
      templateName: null,
      weddingDate: null,
    };
  }

  const weddingData = site.wedding_data as Record<string, unknown> | null;
  const meta = (weddingData?.meta as Record<string, unknown> | undefined) ?? {};
  const persistedDismissals = Array.isArray(meta.intelligenceDismissals)
    ? meta.intelligenceDismissals.filter((id): id is string => typeof id === 'string')
    : [];
  const weddingDate = resolveWeddingDateFromData(weddingData, {
    wedding_date: site.wedding_date,
    venue_date: site.venue_date,
  });
  const templateName = site.template_id ?? null;

  if (isWeddingProfile(site.onboarding_answers)) {
    const draftBrief = getWeddingProfileSummary(site.onboarding_answers);
    return {
      draftBrief,
      draftBriefDebug: `valid:${draftBrief.length}`,
      draftRefineTargets: getWeddingProfileRefineTargets(site.onboarding_answers),
      persistedDismissals,
      templateName,
      weddingDate,
    };
  }

  const fallbackCoupleValue = getOverviewFallbackCoupleValue(site.couple_name_1, site.couple_name_2);
  const fallbackSummary = [
    fallbackCoupleValue ? { id: 'couple', label: 'Couple', value: fallbackCoupleValue, questionKey: 'partnerNames' } : null,
    site.wedding_date ? { id: 'date', label: 'Date', value: site.wedding_date, questionKey: 'weddingDate' } : null,
    site.venue_name ? { id: 'venue', label: 'Venue', value: site.venue_name, questionKey: 'venueName' } : null,
    site.wedding_location ? { id: 'location', label: 'Location', value: site.wedding_location, questionKey: 'venueLocation' } : null,
    typeof (weddingData?.couple as Record<string, unknown> | undefined)?.story === 'string'
      ? { id: 'story', label: 'Story', value: (weddingData?.couple as Record<string, unknown>).story as string, questionKey: 'story' }
      : null,
  ].filter(Boolean) as DraftBriefItem[];

  return {
    draftBrief: fallbackSummary,
    draftBriefDebug: `fallback:${fallbackSummary.length}`,
    draftRefineTargets: [],
    persistedDismissals,
    templateName,
    weddingDate,
  };
}

export function buildNameChangeOverviewSnapshotState(workspace: { caseRecord: unknown } & Record<string, unknown> | null): {
  nameChangeInsights: NameChangeOverviewInsights;
  nameChangeOverviewState: NameChangeOverviewStateValue;
} {
  if (!workspace?.caseRecord) {
    return {
      nameChangeInsights: { ...DEFAULT_NAME_CHANGE_INSIGHTS },
      nameChangeOverviewState: { hasWorkspace: false, workflowStatus: null, hasExecutionActivity: false },
    };
  }

  const hydratedWorkspace = hydrateNameChangeWorkspace(workspace as never);
  const executionCounts = hydratedWorkspace.plan.summary.executionCounts ?? {
    todo: hydratedWorkspace.plan.steps.length,
    in_progress: 0,
    complete: 0,
  };

  return {
    nameChangeInsights: buildNameChangeOverviewInsights(hydratedWorkspace),
    nameChangeOverviewState: {
      hasWorkspace: true,
      workflowStatus: deriveNameChangeLifecycleStatus(hydratedWorkspace.plan),
      hasExecutionActivity: executionCounts.in_progress > 0 || executionCounts.complete > 0,
    },
  };
}

export function buildOverviewStatsFromSnapshot({
  activeSitePermissions,
  activeSiteRole,
  activePhotoAlbumCount,
  contactableGuestCount,
  confirmedGuests,
  declinedGuests,
  enabledVaultCount,
  hideFromSearch,
  isPublished,
  lastPublishedAt,
  messageReviewCount,
  notificationPrefs,
  newPhotoUploadCount,
  pendingGuests,
  photoAlbumCount,
  publishedVersion,
  recentRsvps,
  analyticsEventSummary,
  registryItemCount,
  seatingGapCount,
  site,
  siteId,
  siteSlug,
  siteUpdatedAt,
  templateName,
  totalGuests,
  upcomingPaymentCount,
  upcomingTaskCount,
  vaultCount,
  weddingDate,
}: {
  activeSitePermissions: PlannerPermissionKey[] | null;
  activeSiteRole: PlannerAccessRole;
  activePhotoAlbumCount: number;
  contactableGuestCount: number;
  confirmedGuests: number;
  declinedGuests: number;
  enabledVaultCount: number;
  hideFromSearch: boolean;
  isPublished: boolean;
  lastPublishedAt: string | null;
  messageReviewCount: number;
  notificationPrefs: NotificationPrefs;
  newPhotoUploadCount: number;
  pendingGuests: number;
  photoAlbumCount: number;
  publishedVersion: number | null;
  recentRsvps: RecentRsvp[];
  analyticsEventSummary: AnalyticsEventSummary;
  registryItemCount: number;
  seatingGapCount: number;
  site: { couple_name_1?: string | null; couple_name_2?: string | null; venue_name?: string | null; wedding_location?: string | null; wedding_data?: unknown } | null;
  siteId: string | null;
  siteSlug: string | null;
  siteUpdatedAt: string | null;
  templateName: string | null;
  totalGuests: number;
  upcomingPaymentCount: number;
  upcomingTaskCount: number;
  vaultCount: number;
  weddingDate: string | null;
}): OverviewStatsState {
  const analyticsSettings = normalizeAnalyticsSettings(
    (site?.wedding_data && typeof site.wedding_data === 'object'
      ? (site.wedding_data as Record<string, unknown>).analytics_settings
      : null),
  );
  return {
    siteId,
    publishedVersion,
    lastPublishedAt,
    totalGuests,
    confirmedGuests,
    declinedGuests,
    pendingGuests,
    daysUntilWedding: calcOverviewDaysUntil(weddingDate),
    weddingDate,
    siteSlug,
    isPublished,
    privacyMode: 'public',
    hideFromSearch,
    siteUpdatedAt,
    templateName,
    coupleName1: site?.couple_name_1 ?? null,
    coupleName2: site?.couple_name_2 ?? null,
    venueName: site?.venue_name ?? null,
    venueLocation: site?.wedding_location ?? null,
    registryItemCount,
    photoAlbumCount,
    activePhotoAlbumCount,
    vaultCount,
    enabledVaultCount,
    messageReviewCount,
    upcomingTaskCount,
    upcomingPaymentCount,
    newPhotoUploadCount,
    seatingGapCount,
    contactableGuestCount,
    recentRsvps,
    analyticsEventSummary,
    analyticsEnabled: analyticsSettings.enabled,
    analyticsRetentionDays: analyticsSettings.retentionDays,
    analyticsGuestNotice: analyticsSettings.guestNotice,
    activeSiteRole,
    activeSitePermissions,
    notificationPrefs,
  };
}
