import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ACTIVE_SITE_STORAGE_CHANGED_EVENT } from '../../lib/activeSiteStorage';
import { readSetupDraft, setupDraftProgress } from '../../lib/setupDraft';
import { resolvePublicSiteSlugFromRow } from '../../lib/publicSiteSlug';
import { isGuestFacingSiteRowReady, pickGuestFacingReadinessRow } from '../../lib/publicSiteReadiness';
import { normalizeNotificationPrefs } from '../../lib/notificationPrefs';
import { listBuilderRevisions, type BuilderRevision } from '../../builder/services/versionHistory';
import { loadNameChangeWorkspace } from './planning/nameChangeService';
import {
  loadOverviewDashboardSnapshot,
  loadOverviewInteractiveData,
  type OverviewInteractiveSuggestion as OverviewInteractiveSuggestionRow,
  type OverviewInteractiveVoteSummary,
} from './overviewService';
import {
  buildDemoOverviewSnapshotState,
  buildNameChangeOverviewSnapshotState,
  buildOverviewSiteDraftState,
  buildOverviewStatsFromSnapshot,
  DEFAULT_NAME_CHANGE_INSIGHTS,
  type OverviewStatsState,
} from './buildOverviewSnapshotState';
import { type NameChangeOverviewInsights } from './nameChangeOverviewInsights';

type Args = {
  dismissedIntelligenceIds: string[];
  isDemoMode: boolean;
  setDismissedIntelligenceIds: React.Dispatch<React.SetStateAction<string[]>>;
  storageKey: string;
  userId: string | null;
};

export function useOverviewDashboardData({
  dismissedIntelligenceIds: _dismissedIntelligenceIds,
  isDemoMode,
  setDismissedIntelligenceIds,
  storageKey,
  userId,
}: Args) {
  const [searchParams] = useSearchParams();
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
  const [activeSiteSyncVersion, setActiveSiteSyncVersion] = useState(0);
  const [nameChangeOverviewState, setNameChangeOverviewState] = useState<{ hasWorkspace: boolean; workflowStatus: 'draft' | 'ready' | 'in_progress' | 'complete' | null; hasExecutionActivity: boolean; }>({ hasWorkspace: false, workflowStatus: null, hasExecutionActivity: false });
  const [nameChangeInsights, setNameChangeInsights] = useState<NameChangeOverviewInsights>(DEFAULT_NAME_CHANGE_INSIGHTS);
  const [showMoreDetail, setShowMoreDetail] = useState(() => searchParams.get('details') === '1');
  const loadStatsRequestIdRef = useRef(0);

  useEffect(() => {
    setShowMoreDetail(searchParams.get('details') === '1');
  }, [searchParams]);

  const resetOverviewDashboardState = useCallback(() => {
    setStats(null);
    setError(null);
    setSetupDraftProgressPercent(0);
    setInteractiveSuggestions([]);
    setInteractiveVoteSummaries([]);
    setInteractiveLoading(false);
    setRecentSiteActivity([]);
    setDraftBrief([]);
    setBriefUpdatedAt(null);
    setRefreshingBrief(false);
    setDraftRefineTargets([]);
    setDraftBriefDebug('init');
    setNameChangeOverviewState({ hasWorkspace: false, workflowStatus: null, hasExecutionActivity: false });
    setNameChangeInsights(DEFAULT_NAME_CHANGE_INSIGHTS);
  }, []);

  const loadStats = useCallback(async () => {
    const requestId = ++loadStatsRequestIdRef.current;
    const isCurrentRequest = () => requestId === loadStatsRequestIdRef.current;

    if (!userId) {
      resetOverviewDashboardState();
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (isDemoMode) {
        const demoState = buildDemoOverviewSnapshotState();
        setStats(demoState.stats);
        setNameChangeOverviewState(demoState.nameChangeOverviewState);
        setNameChangeInsights(demoState.nameChangeInsights);
        setRecentSiteActivity([]);
        setBriefUpdatedAt(null);
        return;
      }

      const overviewSnapshot = await loadOverviewDashboardSnapshot(userId);
      if (!isCurrentRequest()) return;

      const { activeSite, site } = overviewSnapshot;
      const siteDraftState = buildOverviewSiteDraftState(site);
      if (siteDraftState.persistedDismissals.length > 0) {
        setDismissedIntelligenceIds((current) => {
          const next = Array.from(new Set([...current, ...siteDraftState.persistedDismissals]));
          try {
            localStorage.setItem(storageKey, JSON.stringify(next));
          } catch {}
          return next;
        });
      }
      setDraftBrief(siteDraftState.draftBrief);
      setDraftRefineTargets(siteDraftState.draftRefineTargets);
      setDraftBriefDebug(siteDraftState.draftBriefDebug);
      setBriefUpdatedAt(site?.updated_at ?? null);

      const siteActivity = site?.id ? await listBuilderRevisions(site.id) : [];
      if (!isCurrentRequest()) return;
      setRecentSiteActivity(siteActivity.slice(0, 6));

      const workspace = site?.id ? await loadNameChangeWorkspace(site.id) : null;
      if (!isCurrentRequest()) return;
      const nameChangeSnapshot = buildNameChangeOverviewSnapshotState(workspace);
      setNameChangeOverviewState(nameChangeSnapshot.nameChangeOverviewState);
      setNameChangeInsights(nameChangeSnapshot.nameChangeInsights);

      const siteJson = (site?.site_json as Record<string, unknown> | null) ?? null;
      const hideFromSearch = siteJson?.hide_from_search === true;
      const isPublished = site?.is_published === true;
      const guestFacingSiteRow = pickGuestFacingReadinessRow(site as unknown as Record<string, unknown> | null);
      const siteSlug = resolvePublicSiteSlugFromRow(guestFacingSiteRow);
      const guestFacingReady = isGuestFacingSiteRowReady(guestFacingSiteRow);
      const privacyMode = site?.privacy_mode === 'password_protected' || site?.privacy_mode === 'invite_only' || site?.privacy_mode === 'hidden'
        ? site.privacy_mode
        : 'public';
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
        guestFacingReady,
        privacyMode,
        lastPublishedAt: typeof siteJson?.lastPublishedAt === 'string' ? (siteJson.lastPublishedAt as string) : null,
        messageReviewCount: overviewSnapshot.messageReviewCount,
        notificationPrefs: normalizeNotificationPrefs((site?.notification_prefs as Record<string, unknown> | null) ?? null),
        newPhotoUploadCount: overviewSnapshot.newPhotoUploadCount,
        pendingGuests: overviewSnapshot.pendingGuests,
        photoAlbumCount: overviewSnapshot.photoAlbumCount,
        publishedVersion: typeof siteJson?.publishedVersion === 'number' ? (siteJson.publishedVersion as number) : null,
        recentRsvps: overviewSnapshot.recentRsvps,
        analyticsEventSummary: overviewSnapshot.analyticsEventSummary,
        registryItemCount: overviewSnapshot.registryItemCount,
        seatingGapCount: overviewSnapshot.seatingGapCount,
        site,
        siteId: site?.id ?? null,
        siteSlug,
        siteUpdatedAt: site?.updated_at ?? null,
        templateName: siteDraftState.templateName,
        totalGuests: overviewSnapshot.totalGuests,
        upcomingPaymentCount: overviewSnapshot.upcomingPaymentCount,
        upcomingTaskCount: overviewSnapshot.upcomingTaskCount,
        vaultCount: overviewSnapshot.vaultCount,
        weddingDate: siteDraftState.weddingDate,
      }));
    } catch {
      if (!isCurrentRequest()) return;
      setError('Couldn’t load your overview right now.');
    } finally {
      if (isCurrentRequest()) {
        setLoading(false);
      }
    }
  }, [activeSiteSyncVersion, isDemoMode, resetOverviewDashboardState, setDismissedIntelligenceIds, storageKey, userId]);

  useEffect(() => {
    if (!userId) {
      resetOverviewDashboardState();
      setLoading(false);
      return;
    }
    void loadStats();
  }, [loadStats, resetOverviewDashboardState, userId]);

  useEffect(() => {
    const handleActiveSiteChanged = () => {
      setActiveSiteSyncVersion((version) => version + 1);
    };

    window.addEventListener(ACTIVE_SITE_STORAGE_CHANGED_EVENT, handleActiveSiteChanged);
    window.addEventListener('storage', handleActiveSiteChanged);
    return () => {
      window.removeEventListener(ACTIVE_SITE_STORAGE_CHANGED_EVENT, handleActiveSiteChanged);
      window.removeEventListener('storage', handleActiveSiteChanged);
    };
  }, []);

  useEffect(() => {
    const refreshProgress = () => setSetupDraftProgressPercent(setupDraftProgress(readSetupDraft(userId)));
    refreshProgress();
    window.addEventListener('focus', refreshProgress);
    return () => window.removeEventListener('focus', refreshProgress);
  }, [userId]);

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
      if (!mounted) return;
      setInteractiveLoading(false);
    };

    void loadSuggestions();
    return () => {
      mounted = false;
    };
  }, [stats?.siteSlug, isDemoMode]);

  return {
    briefUpdatedAt,
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
    setNameChangeInsights,
    setNameChangeOverviewState,
    setRecentSiteActivity,
    setRefreshingBrief,
    setShowMoreDetail,
    setupDraftProgressPercent,
    showMoreDetail,
    stats,
  };
}
