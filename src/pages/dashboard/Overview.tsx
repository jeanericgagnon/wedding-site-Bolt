import React, { useEffect, useState } from 'react';
import { readSetupDraft, setupDraftProgress } from '../../lib/setupDraft';
import {
  buildSetupChecklist,
} from './overviewUtils';
import { useNavigate } from 'react-router-dom';
import { resolvePublicSiteSlugFromRow } from '../../lib/publicSiteSlug';
import { useAuth } from '../../hooks/useAuth';
import { listBuilderRevisions, type BuilderRevision } from '../../builder/services/versionHistory';
import { hasRespondedRsvpStatus } from '../../lib/rsvpStatus';
import { useToast } from '../../components/ui/Toast';
import { buildNameChangeOverviewCardModel } from './nameChangeOverviewCard';
import { type NameChangeOverviewInsights } from './nameChangeOverviewInsights';
import { loadNameChangeWorkspace } from './planning/nameChangeService';
import {
  loadOverviewDashboardSnapshot,
  loadOverviewInteractiveData,
  type OverviewInteractiveSuggestion as OverviewInteractiveSuggestionRow,
  type OverviewInteractiveVoteSummary,
} from './overviewService';
import { OverviewDashboardRouteView } from './OverviewDashboardRouteView';
import { useOverviewIntelligenceActions } from './useOverviewIntelligenceActions';
import { buildOverviewDashboardModel } from './buildOverviewDashboardModel';
import { OverviewDashboardLiveContent } from './OverviewDashboardLiveContent';
import {
  buildDemoOverviewSnapshotState,
  buildNameChangeOverviewSnapshotState,
  buildOverviewSiteDraftState,
  buildOverviewStatsFromSnapshot,
  DEFAULT_NAME_CHANGE_INSIGHTS,
  type OverviewStatsState,
} from './buildOverviewSnapshotState';

const INTELLIGENCE_DISMISSALS_STORAGE_KEY = 'dayof_intelligence_dismissed_v1';

export const DashboardOverview: React.FC = () => {
  const { toast } = useToast();

  const { user, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<OverviewStatsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupDraftProgressPercent, setSetupDraftProgressPercent] = useState<number>(0);
  const [interactiveSuggestions, setInteractiveSuggestions] = useState<OverviewInteractiveSuggestionRow[]>([]);
  const [interactiveVoteSummaries, setInteractiveVoteSummaries] = useState<OverviewInteractiveVoteSummary[]>([]);
  const [interactiveLoading, setInteractiveLoading] = useState(false);
  const [recentSiteActivity, setRecentSiteActivity] = useState<BuilderRevision[]>([]);
  const [draftBrief, setDraftBrief] = useState<Array<{ id: string; label: string; value: string; questionKey: string }>>([]);
  const [briefUpdatedAt, setBriefUpdatedAt] = useState<string | null>(null);
  const [refreshingBrief, setRefreshingBrief] = useState(false);
  const [draftRefineTargets, setDraftRefineTargets] = useState<Array<{ id: string; label: string; questionIndex: number; value: string }>>([]);
  const [draftBriefDebug, setDraftBriefDebug] = useState<string>('init');
  const [nameChangeOverviewState, setNameChangeOverviewState] = useState<{ hasWorkspace: boolean; workflowStatus: 'draft' | 'ready' | 'in_progress' | 'complete' | null; hasExecutionActivity: boolean; }>({ hasWorkspace: false, workflowStatus: null, hasExecutionActivity: false });
  const [nameChangeInsights, setNameChangeInsights] = useState<NameChangeOverviewInsights>(DEFAULT_NAME_CHANGE_INSIGHTS);
  const [showMoreDetail, setShowMoreDetail] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('details') === '1';
  });
  const [dismissedIntelligenceIds, setDismissedIntelligenceIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(INTELLIGENCE_DISMISSALS_STORAGE_KEY) ?? '[]') as string[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!user) return;
    loadStats();
  }, [user, isDemoMode]);

  useEffect(() => {
    const refreshProgress = () => setSetupDraftProgressPercent(setupDraftProgress(readSetupDraft()));
    refreshProgress();
    window.addEventListener('focus', refreshProgress);
    return () => window.removeEventListener('focus', refreshProgress);
  }, []);

  useEffect(() => {
    const slug = stats?.siteSlug;
    if (!slug || isDemoMode) {
      setInteractiveSuggestions([]);
      setInteractiveVoteSummaries([]);
      return;
    }

    let mounted = true;
    const loadSuggestions = async () => {
      setInteractiveLoading(true);
      try {
        const { suggestions, voteSummaries } = await loadOverviewInteractiveData(slug);
        if (!mounted) return;
        setInteractiveSuggestions(suggestions);
        setInteractiveVoteSummaries(voteSummaries);
      } catch {
        if (!mounted) return;
        setInteractiveSuggestions([]);
        setInteractiveVoteSummaries([]);
      }
      setInteractiveLoading(false);
    };

    void loadSuggestions();
    return () => {
      mounted = false;
    };
  }, [stats?.siteSlug, isDemoMode]);

  async function loadStats() {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      if (isDemoMode) {
        const demoState = buildDemoOverviewSnapshotState();
        setStats(demoState.stats);
        setNameChangeOverviewState(demoState.nameChangeOverviewState);
        setNameChangeInsights(demoState.nameChangeInsights);
        return;
      }

      const overviewSnapshot = await loadOverviewDashboardSnapshot(user.id);
      const { activeSite, site } = overviewSnapshot;
      const siteDraftState = buildOverviewSiteDraftState(site);
      if (siteDraftState.persistedDismissals.length > 0) {
        setDismissedIntelligenceIds((current) => {
          const next = Array.from(new Set([...current, ...siteDraftState.persistedDismissals]));
          try {
            localStorage.setItem(INTELLIGENCE_DISMISSALS_STORAGE_KEY, JSON.stringify(next));
          } catch {}
          return next;
        });
      }
      setDraftBrief(siteDraftState.draftBrief);
      setDraftRefineTargets(siteDraftState.draftRefineTargets);
      setDraftBriefDebug(siteDraftState.draftBriefDebug);

      const workspace = site?.id ? await loadNameChangeWorkspace(site.id) : null;
      const nameChangeSnapshot = buildNameChangeOverviewSnapshotState(workspace);
      setNameChangeOverviewState(nameChangeSnapshot.nameChangeOverviewState);
      setNameChangeInsights(nameChangeSnapshot.nameChangeInsights);

      const siteJson = (site?.site_json as Record<string, unknown> | null) ?? null;
      const privacyMode = 'public';
      const hideFromSearch = siteJson?.hide_from_search === true;
      const isPublished = Boolean(
        site?.is_published === true ||
          siteJson?.publishStatus === 'published' ||
          (typeof siteJson?.publishedVersion === 'number' && (siteJson.publishedVersion as number) > 0)
      );
      setStats(buildOverviewStatsFromSnapshot({
        activeSitePermissions: activeSite?.permissions ?? null,
        activeSiteRole: activeSite?.role ?? 'owner',
        activePhotoAlbumCount: overviewSnapshot.activePhotoAlbumCount,
        contactableGuestCount: overviewSnapshot.contactableGuestCount,
        confirmedGuests: overviewSnapshot.confirmedGuests,
        declinedGuests: overviewSnapshot.declinedGuests,
        enabledVaultCount: overviewSnapshot.enabledVaultCount,
        hideFromSearch,
        isPublished,
        lastPublishedAt: typeof siteJson?.lastPublishedAt === 'string' ? (siteJson.lastPublishedAt as string) : null,
        pendingGuests: overviewSnapshot.pendingGuests,
        photoAlbumCount: overviewSnapshot.photoAlbumCount,
        publishedVersion: typeof siteJson?.publishedVersion === 'number' ? (siteJson.publishedVersion as number) : null,
        recentRsvps: overviewSnapshot.recentRsvps,
        registryItemCount: overviewSnapshot.registryItemCount,
        site,
        siteId: site?.id ?? null,
        siteSlug: resolvePublicSiteSlugFromRow((site as unknown as Record<string, unknown> | null) ?? null),
        siteUpdatedAt: site?.updated_at ?? null,
        templateName: siteDraftState.templateName,
        totalGuests: overviewSnapshot.totalGuests,
        vaultCount: overviewSnapshot.vaultCount,
        weddingDate: siteDraftState.weddingDate,
      }));
    } catch {
      setError('Couldn’t load your overview right now.');
    } finally {
      setLoading(false);
    }
  }

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
