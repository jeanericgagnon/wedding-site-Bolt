import { useState } from 'react';
import { buildSetupChecklist } from './overviewUtils';
import type { OverviewStatsState } from './buildOverviewSnapshotState';

const INTELLIGENCE_DISMISSALS_STORAGE_KEY = 'dayof_intelligence_dismissed_v1';

interface PublishBlockerLike {
  label: string;
  route: string;
}

interface BuildOverviewDashboardRouteSupportInput {
  firstPublishBlocker: PublishBlockerLike | null;
  navigate: (href: string) => void;
  stats: OverviewStatsState | null;
}

export function buildOverviewDashboardRouteSupport({
  firstPublishBlocker,
  navigate,
  stats,
}: BuildOverviewDashboardRouteSupportInput) {
  const setupChecklist = stats
    ? buildSetupChecklist({
        coupleName1: stats.coupleName1 ?? '',
        coupleName2: stats.coupleName2 ?? '',
        weddingDate: stats.weddingDate ?? '',
        venueName: stats.venueName ?? '',
        venueLocation: stats.venueLocation ?? '',
        registryItemCount: stats.registryItemCount,
        photoAlbumCount: stats.photoAlbumCount,
        isPublished: stats.isPublished,
        siteSlug: stats.siteSlug ?? '',
        templateName: stats.templateName ?? '',
      }).map((item) => ({ ...item, action: () => navigate(item.route) }))
    : [];

  const setupCompletedCount = setupChecklist.filter((item) => item.done).length;
  const setupProgressRatio = setupChecklist.length > 0 ? setupCompletedCount / setupChecklist.length : 0;
  const coupleLabel = [stats?.coupleName1, stats?.coupleName2].filter(Boolean).join(' & ') || 'your wedding';
  const heroVenueLine = [stats?.venueName, stats?.venueLocation].filter(Boolean).join(' · ');
  const nextStepLabel =
    firstPublishBlocker?.label ??
    ((stats?.pendingGuests ?? 0) > 0
      ? 'Follow up with guests still awaiting RSVP'
      : stats?.isPublished
        ? 'Review recent activity before the next guest update'
        : 'Review your site before sharing');
  const nextStepActionLabel = firstPublishBlocker
    ? 'Fix next setup item'
    : stats?.isPublished
      ? 'Open guests'
      : 'Edit site';
  const nextStepAction = firstPublishBlocker
    ? () => navigate(firstPublishBlocker.route)
    : () => navigate(stats?.isPublished ? '/dashboard/guests' : '/dashboard/builder?publishNow=1');

  return {
    coupleLabel,
    heroVenueLine,
    nextStepAction,
    nextStepActionLabel,
    nextStepLabel,
    setupChecklistLength: setupChecklist.length,
    setupCompletedCount,
    setupProgressRatio,
  };
}

export function useOverviewDashboardRouteSupport() {
  const [dismissedIntelligenceIds, setDismissedIntelligenceIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(INTELLIGENCE_DISMISSALS_STORAGE_KEY) ?? '[]') as string[];
    } catch {
      return [];
    }
  });

  const showInternalProof =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('proof') === '1';

  return {
    dismissedIntelligenceIds,
    setDismissedIntelligenceIds,
    showInternalProof,
    storageKey: INTELLIGENCE_DISMISSALS_STORAGE_KEY,
  };
}
