import { buildAnalyticsBaseline } from './analyticsBaseline';
import type { AnalyticsEventSummary } from './analyticsEventSummary';
import { buildPublishReadinessItems, getChecklistProgress, getFirstIncompleteChecklistItem, getIncompleteChecklistItems } from './overviewUtils';
import { getSiteVisibilityState } from '../../lib/siteVisibilityState';
import { getPublishStateDescriptor } from '../../lib/publishState';
import { getArchiveModeDescriptor } from '../../lib/archiveMode';
import { buildLaunchReadiness } from '../../lib/launchReadiness';
import { buildPlanningAssistantModel } from '../../lib/aiPlanningAssistant';
import { buildInvisibleIntelligenceSuggestions, type IntelligenceSuggestion } from '../../lib/invisibleIntelligence';
import { buildCalmDigestDeliveryPreview, buildCalmOwnerDigest } from '../../lib/calmOwnerDigest';
import type { NotificationPrefs } from '../../lib/notificationPrefs';
import { buildWebsiteInviteAnalyticsFunnelReview, buildWebsiteInviteAnalyticsReadiness } from '../../lib/websiteInviteAnalyticsReadiness';
import type { PlannerAccessRole, PlannerPermissionKey } from '../../lib/plannerAccess';

type RecentRsvp = {
  id: string;
  guestName: string;
  status: 'confirmed' | 'declined' | 'accepted' | 'attending' | 'not_attending';
  receivedAt: string;
};

type OverviewStatsLike = {
  activeSitePermissions: PlannerPermissionKey[] | null;
  activeSiteRole: PlannerAccessRole;
  activePhotoAlbumCount: number;
  contactableGuestCount: number;
  confirmedGuests: number;
  coupleName1: string | null;
  coupleName2: string | null;
  declinedGuests: number;
  hideFromSearch: boolean;
  isPublished: boolean;
  guestFacingReady: boolean;
  pendingGuests: number;
  photoAlbumCount: number;
  privacyMode?: 'public' | 'password_protected' | 'invite_only' | 'hidden';
  recentRsvps: RecentRsvp[];
  analyticsEventSummary: AnalyticsEventSummary;
  registryItemCount: number;
  messageReviewCount: number;
  upcomingTaskCount: number;
  upcomingPaymentCount: number;
  newPhotoUploadCount: number;
  seatingGapCount: number;
  siteSlug: string | null;
  siteUpdatedAt: string | null;
  lastPublishedAt: string | null;
  templateName: string | null;
  totalGuests: number;
  venueLocation: string | null;
  venueName: string | null;
  weddingDate: string | null;
  notificationPrefs: NotificationPrefs;
};

type OverviewChecklistItem = ReturnType<typeof buildPublishReadinessItems>[number];

export function buildOverviewDashboardModel({
  dismissedIntelligenceIds,
  interactiveSuggestions,
  interactiveVoteSummaries,
  stats,
}: {
  dismissedIntelligenceIds: string[];
  interactiveSuggestions: Array<{ id: string }>;
  interactiveVoteSummaries: Array<unknown>;
  stats: OverviewStatsLike | null;
}) {
  const responseRate =
    stats && stats.totalGuests > 0
      ? Math.round(((stats.confirmedGuests + stats.declinedGuests) / stats.totalGuests) * 100)
      : null;

  const attendanceRate =
    stats && stats.totalGuests > 0
      ? Math.round((stats.confirmedGuests / stats.totalGuests) * 100)
      : null;

  const contactCoverage =
    stats && stats.totalGuests > 0
      ? Math.round((stats.contactableGuestCount / stats.totalGuests) * 100)
      : null;

  const analyticsBaseline = buildAnalyticsBaseline({
    totalGuests: stats?.totalGuests ?? 0,
    confirmedGuests: stats?.confirmedGuests ?? 0,
    declinedGuests: stats?.declinedGuests ?? 0,
    pendingGuests: stats?.pendingGuests ?? 0,
    contactableGuests: stats?.contactableGuestCount ?? 0,
    registryItemCount: stats?.registryItemCount ?? 0,
    photoAlbumCount: stats?.photoAlbumCount ?? 0,
    activePhotoAlbumCount: stats?.activePhotoAlbumCount ?? 0,
    interactiveSuggestionCount: interactiveSuggestions.length,
    websiteVisitCount: (stats?.analyticsEventSummary.siteVisits ?? 0) + (stats?.analyticsEventSummary.inviteOpens ?? 0) + (stats?.analyticsEventSummary.qrScans ?? 0),
    inviteOpenCount: stats?.analyticsEventSummary.inviteOpens ?? 0,
    qrScanCount: stats?.analyticsEventSummary.qrScans ?? 0,
  });

  const websiteInviteAnalytics = buildWebsiteInviteAnalyticsReadiness({
    siteSlug: stats?.siteSlug ?? null,
    isPublished: stats?.isPublished ?? false,
    totalGuests: stats?.totalGuests ?? 0,
    confirmedGuests: stats?.confirmedGuests ?? 0,
    declinedGuests: stats?.declinedGuests ?? 0,
    pendingGuests: stats?.pendingGuests ?? 0,
    contactableGuests: stats?.contactableGuestCount ?? 0,
    registryItemCount: stats?.registryItemCount ?? 0,
    photoAlbumCount: stats?.photoAlbumCount ?? 0,
    activePhotoAlbumCount: stats?.activePhotoAlbumCount ?? 0,
    interactiveSuggestionCount: interactiveSuggestions.length,
    interactiveVoteWidgetCount: interactiveVoteSummaries.length,
    recentRsvpCount: stats?.recentRsvps.length ?? 0,
    websiteVisitCount: (stats?.analyticsEventSummary.siteVisits ?? 0) + (stats?.analyticsEventSummary.inviteOpens ?? 0) + (stats?.analyticsEventSummary.qrScans ?? 0),
    inviteOpenCount: stats?.analyticsEventSummary.inviteOpens ?? 0,
    qrScanCount: stats?.analyticsEventSummary.qrScans ?? 0,
  });

  const websiteInviteAnalyticsFunnel = buildWebsiteInviteAnalyticsFunnelReview(websiteInviteAnalytics);
  const launchReadiness = stats ? buildLaunchReadiness(stats) : null;
  const planningAssistant = stats && launchReadiness ? buildPlanningAssistantModel(stats, launchReadiness) : null;
  const invisibleSuggestions: IntelligenceSuggestion[] = stats
    ? buildInvisibleIntelligenceSuggestions(stats).filter((suggestion) => !dismissedIntelligenceIds.includes(suggestion.id))
    : [];

  const publishReadinessItems: OverviewChecklistItem[] = buildPublishReadinessItems({
    coupleName1: stats?.coupleName1 ?? '',
    coupleName2: stats?.coupleName2 ?? '',
    weddingDate: stats?.weddingDate ?? '',
    venueName: stats?.venueName ?? '',
    venueLocation: stats?.venueLocation ?? '',
    registryItemCount: stats?.registryItemCount ?? 0,
    photoAlbumCount: stats?.photoAlbumCount ?? 0,
    isPublished: stats?.isPublished ?? false,
    siteSlug: stats?.siteSlug ?? '',
    templateName: stats?.templateName ?? '',
  });

  const siteVisibility = getSiteVisibilityState({
    isPublished: stats?.isPublished,
    isGuestFacingReady: stats?.guestFacingReady,
    privacyMode: stats?.privacyMode,
    hideFromSearch: stats?.hideFromSearch,
  });

  const archiveMode = getArchiveModeDescriptor({ weddingDate: stats?.weddingDate ?? null });
  const publishState = getPublishStateDescriptor({
    isPublished: stats?.isPublished,
    hasUnsavedChanges: stats?.isPublished && stats?.siteUpdatedAt && stats?.lastPublishedAt
      ? new Date(stats.siteUpdatedAt).getTime() > new Date(stats.lastPublishedAt).getTime()
      : false,
  });

  const publishBadgeVariant: 'success' | 'warning' | 'error' | 'secondary' = publishState.tone === 'success'
    ? 'success'
    : publishState.tone === 'warning'
      ? 'warning'
      : publishState.tone === 'danger'
        ? 'error'
        : 'secondary';

  const publishProgress = getChecklistProgress(publishReadinessItems);
  const publishBlockers = getIncompleteChecklistItems(publishReadinessItems);
  const firstPublishBlocker = getFirstIncompleteChecklistItem(publishReadinessItems);

  const calmDigest = stats ? buildCalmOwnerDigest({
    role: stats.activeSiteRole,
    permissions: stats.activeSitePermissions,
    newRsvpCount: stats.recentRsvps.length,
    pendingRsvpCount: stats.pendingGuests,
    missingContactCount: Math.max(0, stats.totalGuests - stats.contactableGuestCount),
    messageFailureCount: stats.messageReviewCount,
    upcomingTaskCount: stats.upcomingTaskCount,
    upcomingPaymentCount: stats.upcomingPaymentCount,
    newPhotoUploadCount: stats.newPhotoUploadCount,
    activePhotoAlbumCount: stats.activePhotoAlbumCount,
    seatingGapCount: stats.seatingGapCount,
    registryItemCount: stats.registryItemCount,
    isPublished: stats.isPublished,
    publishBlockerCount: publishBlockers.length,
  }) : null;

  const calmDigestPreview = calmDigest && stats ? buildCalmDigestDeliveryPreview({
    digest: calmDigest,
    cadence: stats.notificationPrefs.digest ? stats.notificationPrefs.digestCadence : 'paused',
    includePlanner: stats.notificationPrefs.digestIncludePlanner,
    quietUntilLabel: stats.notificationPrefs.digestQuietUntilLabel,
    nextDeliveryAt: stats.notificationPrefs.digestNextDeliveryAt,
    lastReviewedAt: stats.notificationPrefs.digestLastReviewedAt,
    lastDeliveredAt: stats.notificationPrefs.digestLastDeliveredAt,
    emailDeliveryEnabled: false,
  }) : null;

  return {
    analyticsBaseline,
    archiveMode,
    attendanceRate,
    calmDigest,
    calmDigestPreview,
    contactCoverage,
    firstPublishBlocker,
    invisibleSuggestions,
    launchReadiness,
    planningAssistant,
    publishBadgeVariant,
    publishBlockers,
    publishProgress,
    publishReadinessItems,
    publishState,
    responseRate,
    siteVisibility,
    websiteInviteAnalytics,
    websiteInviteAnalyticsFunnel,
  };
}
