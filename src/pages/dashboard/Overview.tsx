import React, { useState } from 'react';
import {
  buildSetupChecklist,
} from './overviewUtils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import { buildNameChangeOverviewCardModel } from './nameChangeOverviewCard';
import {
} from './overviewService';
import { OverviewDashboardRouteView } from './OverviewDashboardRouteView';
import { useOverviewIntelligenceActions } from './useOverviewIntelligenceActions';
import { buildOverviewDashboardModel } from './buildOverviewDashboardModel';
import { OverviewDashboardLiveContent } from './OverviewDashboardLiveContent';
import {
} from './buildOverviewSnapshotState';
import { useOverviewDashboardData } from './useOverviewDashboardData';

const INTELLIGENCE_DISMISSALS_STORAGE_KEY = 'dayof_intelligence_dismissed_v1';

export const DashboardOverview: React.FC = () => {
  const { toast } = useToast();

  const { user, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const [dismissedIntelligenceIds, setDismissedIntelligenceIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(INTELLIGENCE_DISMISSALS_STORAGE_KEY) ?? '[]') as string[];
    } catch {
      return [];
    }
  });
  const {
    draftBrief,
    draftBriefDebug,
    draftRefineTargets,
    error,
    interactiveLoading,
    interactiveSuggestions,
    interactiveVoteSummaries,
    loadStats,
    loading,
    nameChangeInsights,
    nameChangeOverviewState,
    recentSiteActivity,
    refreshingBrief,
    setInteractiveSuggestions,
    setRefreshingBrief,
    setShowMoreDetail,
    setupDraftProgressPercent,
    showMoreDetail,
    stats,
  } = useOverviewDashboardData({
    dismissedIntelligenceIds,
    isDemoMode,
    setDismissedIntelligenceIds,
    storageKey: INTELLIGENCE_DISMISSALS_STORAGE_KEY,
    userId: user?.id ?? null,
  });

  const nameChangeCard = buildNameChangeOverviewCardModel(nameChangeOverviewState);

  const {
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
  } = buildOverviewDashboardModel({
    dismissedIntelligenceIds,
    interactiveSuggestions,
    interactiveVoteSummaries,
    stats,
  });
  const showInternalProof = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('proof') === '1';
  const {
    dismissInvisibleSuggestion,
    hideSuggestion,
    refreshDraftFromBrief,
  } = useOverviewIntelligenceActions({
    dismissedIntelligenceIds,
    draftBrief,
    isDemoMode,
    loadStats,
    refreshingBrief,
    setDismissedIntelligenceIds,
    setInteractiveSuggestions,
    setRefreshingBrief,
    stats,
    storageKey: INTELLIGENCE_DISMISSALS_STORAGE_KEY,
    toast,
  });

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
  const publishReadinessItemsWithActions = publishReadinessItems.map((item) => ({ ...item, action: () => navigate(item.route) }));
  const coupleLabel = [stats?.coupleName1, stats?.coupleName2].filter(Boolean).join(' & ') || 'your wedding';
  const heroVenueLine = [stats?.venueName, stats?.venueLocation].filter(Boolean).join(' · ');
  const nextStepLabel = firstPublishBlocker?.label
    ?? ((stats?.pendingGuests ?? 0) > 0
      ? 'Follow up with guests still awaiting RSVP'
      : stats?.isPublished
        ? 'Review recent activity before the next guest update'
        : 'Review your draft website before sharing');
  const nextStepActionLabel = firstPublishBlocker
    ? 'Fix next setup item'
    : stats?.isPublished
      ? 'Open guests'
      : 'Open site builder';
  const nextStepAction = firstPublishBlocker
    ? () => navigate(firstPublishBlocker.route)
    : () => navigate(stats?.isPublished ? '/dashboard/guests' : '/dashboard/builder?publishNow=1');

  return (
    <OverviewDashboardRouteView error={error} loading={loading}>
      <OverviewDashboardLiveContent
        coupleLabel={coupleLabel}
        dashboardModel={{
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
        }}
        draftBrief={draftBrief}
        heroVenueLine={heroVenueLine}
        interactiveLoading={interactiveLoading}
        interactiveSuggestions={interactiveSuggestions}
        interactiveVoteSummaries={interactiveVoteSummaries}
        nameChangeCard={nameChangeCard}
        nameChangeInsights={nameChangeInsights}
        navigate={navigate}
        nextStepAction={nextStepAction}
        nextStepActionLabel={nextStepActionLabel}
        nextStepLabel={nextStepLabel}
        onDismissInvisibleSuggestion={dismissInvisibleSuggestion}
        onHideSuggestion={hideSuggestion}
        onRefreshDraftFromBrief={refreshDraftFromBrief}
        recentSiteActivity={recentSiteActivity}
        refreshingBrief={refreshingBrief}
        setShowMoreDetail={setShowMoreDetail}
        setupChecklistLength={setupChecklist.length}
        setupCompletedCount={setupCompletedCount}
        setupDraftProgressPercent={setupDraftProgressPercent}
        setupProgressRatio={setupProgressRatio}
        showInternalProof={showInternalProof}
        showMoreDetail={showMoreDetail}
        stats={stats}
      />
    </OverviewDashboardRouteView>
  );
};
