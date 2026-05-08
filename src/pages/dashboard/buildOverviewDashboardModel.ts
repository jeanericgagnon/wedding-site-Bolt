import { buildAnalyticsBaseline } from './analyticsBaseline';
import { buildPublishReadinessItems, getChecklistProgress, getFirstIncompleteChecklistItem, getIncompleteChecklistItems } from './overviewUtils';
import { getSiteVisibilityState } from '../../lib/siteVisibilityState';
import { getPublishStateDescriptor } from '../../lib/publishState';
import { getArchiveModeDescriptor } from '../../lib/archiveMode';
import { buildLaunchReadiness } from '../../lib/launchReadiness';
import { buildPlanningAssistantModel } from '../../lib/aiPlanningAssistant';
import { buildInvisibleIntelligenceSuggestions, type IntelligenceSuggestion } from '../../lib/invisibleIntelligence';
import { buildCalmDigestDeliveryPreview, buildCalmOwnerDigest } from '../../lib/calmOwnerDigest';
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
  pendingGuests: number;
  photoAlbumCount: number;
  recentRsvps: RecentRsvp[];
  registryItemCount: number;
  siteSlug: string | null;
  siteUpdatedAt: string | null;
  lastPublishedAt: string | null;
  templateName: string | null;
  totalGuests: number;
  venueLocation: string | null;
  venueName: string | null;
  weddingDate: string | null;
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
    privacyMode: 'public',
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
    messageFailureCount: 0,
    upcomingTaskCount: 0,
    upcomingPaymentCount: 0,
    newPhotoUploadCount: 0,
    activePhotoAlbumCount: stats.activePhotoAlbumCount,
    seatingGapCount: 0,
    registryItemCount: stats.registryItemCount,
    isPublished: stats.isPublished,
    publishBlockerCount: publishBlockers.length,
  }) : null;

  const calmDigestPreview = calmDigest ? buildCalmDigestDeliveryPreview({
    digest: calmDigest,
    cadence: 'weekly',
    includePlanner: stats?.activeSiteRole === 'owner',
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
