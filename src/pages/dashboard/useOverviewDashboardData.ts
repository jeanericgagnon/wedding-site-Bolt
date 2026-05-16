import { useCallback, useEffect, useState } from 'react';
import { readSetupDraft, setupDraftProgress } from '../../lib/setupDraft';
import { resolvePublicSiteSlugFromRow } from '../../lib/publicSiteSlug';
import { isGuestFacingSiteRowReady, isPublicRenderModelGuestReady } from '../../lib/publicSiteReadiness';
import { normalizeNotificationPrefs } from '../../lib/notificationPrefs';
import { fetchPublicSiteAccess } from '../../lib/publicSiteAccess';
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

  const loadStats = useCallback(async () => {
    if (!userId) return;
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
      setRecentSiteActivity(siteActivity.slice(0, 6));

      const workspace = site?.id ? await loadNameChangeWorkspace(site.id) : null;
      const nameChangeSnapshot = buildNameChangeOverviewSnapshotState(workspace);
      setNameChangeOverviewState(nameChangeSnapshot.nameChangeOverviewState);
      setNameChangeInsights(nameChangeSnapshot.nameChangeInsights);

      const siteJson = (site?.site_json as Record<string, unknown> | null) ?? null;
      const hideFromSearch = siteJson?.hide_from_search === true;
      const isPublished = site?.is_published === true;
      const siteSlug = resolvePublicSiteSlugFromRow((site as unknown as Record<string, unknown> | null) ?? null);
      let guestFacingReady = isGuestFacingSiteRowReady(site as unknown as Record<string, unknown> | null);
      if (isPublished && siteSlug) {
        try {
          const publicAccess = await fetchPublicSiteAccess({
            slug: siteSlug,
            language: 'en',
          });
          guestFacingReady = publicAccess.status === 'open'
            && !!publicAccess.site
            && isPublicRenderModelGuestReady(publicAccess.site.render_model);
        } catch {
          guestFacingReady = false;
        }
      }
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
      setError('Couldn’t load your overview right now.');
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, setDismissedIntelligenceIds, storageKey, userId]);

  useEffect(() => {
    if (!userId) return;
    void loadStats();
  }, [loadStats, userId]);

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
