import React from 'react';
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
import {
  buildOverviewDashboardRouteSupport,
  useOverviewDashboardRouteSupport,
} from './useOverviewDashboardRouteSupport';

export const DashboardOverview: React.FC = () => {
  const { toast } = useToast();

  const { user, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const {
    dismissedIntelligenceIds,
    setDismissedIntelligenceIds,
    showInternalProof,
    storageKey,
  } = useOverviewDashboardRouteSupport();
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
    storageKey,
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
    storageKey,
    toast,
  });
  const publishReadinessItemsWithActions = publishReadinessItems.map((item) => ({ ...item, action: () => navigate(item.route) }));
  const routeSupport = buildOverviewDashboardRouteSupport({
    firstPublishBlocker,
    navigate,
    stats,
  });

  return (
    <OverviewDashboardRouteView error={error} loading={loading}>
      <OverviewDashboardLiveContent
        coupleLabel={routeSupport.coupleLabel}
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
        heroVenueLine={routeSupport.heroVenueLine}
        interactiveLoading={interactiveLoading}
        interactiveSuggestions={interactiveSuggestions}
        interactiveVoteSummaries={interactiveVoteSummaries}
        nameChangeCard={nameChangeCard}
        nameChangeInsights={nameChangeInsights}
        navigate={navigate}
        nextStepAction={routeSupport.nextStepAction}
        nextStepActionLabel={routeSupport.nextStepActionLabel}
        nextStepLabel={routeSupport.nextStepLabel}
        onDismissInvisibleSuggestion={dismissInvisibleSuggestion}
        onHideSuggestion={hideSuggestion}
        onRefreshDraftFromBrief={refreshDraftFromBrief}
        recentSiteActivity={recentSiteActivity}
        refreshingBrief={refreshingBrief}
        setShowMoreDetail={setShowMoreDetail}
        setupChecklistLength={routeSupport.setupChecklistLength}
        setupCompletedCount={routeSupport.setupCompletedCount}
        setupDraftProgressPercent={setupDraftProgressPercent}
        setupProgressRatio={routeSupport.setupProgressRatio}
        showInternalProof={showInternalProof}
        showMoreDetail={showMoreDetail}
        stats={stats}
      />
    </OverviewDashboardRouteView>
  );
};
