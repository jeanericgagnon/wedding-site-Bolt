import React, { useEffect, useState } from 'react';
import { readSetupDraft, setupDraftProgress } from '../../lib/setupDraft';
import {
  buildSetupChecklist,
} from './overviewUtils';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '../../components/ui';
import { Eye, Users, ExternalLink, Edit, EyeOff, Palette, Radio } from 'lucide-react';
import { getWeddingProfileRefineTargets, getWeddingProfileSummary, isWeddingProfile } from '../../lib/weddingProfile';
import { useAuth } from '../../hooks/useAuth';
import { demoWeddingSite, demoGuests } from '../../lib/demoData';
import { resolvePublicSiteSlugFromRow } from '../../lib/publicSiteSlug';
import { getSiteVisibilityState } from '../../lib/siteVisibilityState';
import { getPublishStateDescriptor } from '../../lib/publishState';
import { listBuilderRevisions, type BuilderRevision } from '../../builder/services/versionHistory';
import { getArchiveModeDescriptor } from '../../lib/archiveMode';
import { hasRespondedRsvpStatus, isAttendingRsvpStatus, isDeclinedRsvpStatus, isPendingRsvpStatus } from '../../lib/rsvpStatus';
import { writeOnboardingResumeTarget } from '../../lib/onboardingResumeStorage';
import { useToast } from '../../components/ui/Toast';
import { calcOverviewDaysUntil, formatOverviewRelativeTime, formatOverviewWeddingDate } from './overviewDate';
import { getOverviewFallbackCoupleValue } from './overviewDraftBrief';
import { buildNameChangeOverviewCardModel } from './nameChangeOverviewCard';
import { buildNameChangeOverviewInsights, type NameChangeOverviewInsights } from './nameChangeOverviewInsights';
import { NAME_CHANGE_LIFECYCLE_LABELS } from './nameChangeLifecycleLabels';
import { deriveNameChangeLifecycleStatus } from './nameChangeLifecycleStatus';
import { hydrateNameChangeWorkspace, loadNameChangeWorkspace } from './planning/nameChangeService';
import { type CalmDigestPriority } from '../../lib/calmOwnerDigest';
import type { PlannerAccessRole, PlannerPermissionKey } from '../../lib/plannerAccess';
import {
  loadOverviewDashboardSnapshot,
  loadOverviewInteractiveData,
  type OverviewInteractiveSuggestion as OverviewInteractiveSuggestionRow,
  type OverviewInteractiveVoteSummary,
} from './overviewService';
import { OverviewDashboardRouteView } from './OverviewDashboardRouteView';
import { useOverviewIntelligenceActions } from './useOverviewIntelligenceActions';
import { buildOverviewDashboardModel } from './buildOverviewDashboardModel';

const INTELLIGENCE_DISMISSALS_STORAGE_KEY = 'dayof_intelligence_dismissed_v1';

const DEFAULT_NAME_CHANGE_INSIGHTS: NameChangeOverviewInsights = {
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

const CALM_DIGEST_PRIORITY_LABELS: Record<CalmDigestPriority, string> = {
  now: 'Now',
  soon: 'Soon',
  watch: 'Watch',
  quiet: 'Quiet',
};

interface OverviewStats {
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
  contactableGuestCount: number;
  recentRsvps: RecentRsvp[];
  activeSiteRole: PlannerAccessRole;
  activeSitePermissions: PlannerPermissionKey[] | null;
}

interface RecentRsvp {
  id: string;
  guestName: string;
  status: 'confirmed' | 'declined' | 'accepted' | 'attending' | 'not_attending';
  receivedAt: string;
}

function formatInteractiveVoteLabel(value: string): string {
  return value
    .replace(/^(poll|quiz)[-_:]/i, '')
    .replace(/[-_:]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolveWeddingDateFromData(
  weddingData: Record<string, unknown> | null,
  site: { wedding_date?: string | null; venue_date?: string | null } | null
): string | null {
  const event = (weddingData?.event as Record<string, unknown> | undefined) ?? undefined;
  const eventWeddingDateISO = typeof event?.weddingDateISO === 'string' ? event.weddingDateISO : null;
  const legacyWeddingDate = typeof weddingData?.weddingDate === 'string' ? (weddingData.weddingDate as string) : null;
  return eventWeddingDateISO ?? legacyWeddingDate ?? site?.wedding_date ?? site?.venue_date ?? null;
}

export const DashboardOverview: React.FC = () => {
  const { toast } = useToast();

  const { user, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<OverviewStats | null>(null);
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
        const confirmed = demoGuests.filter((g) => isAttendingRsvpStatus(g.rsvp_status));
        const declined = demoGuests.filter((g) => isDeclinedRsvpStatus(g.rsvp_status));
        const pending = demoGuests.filter((g) => isPendingRsvpStatus(g.rsvp_status));

        const recentRsvps: RecentRsvp[] = [...confirmed, ...declined]
          .slice(0, 5)
          .map((g, i) => ({
            id: g.id,
            guestName: g.name || `${g.first_name ?? ''} ${g.last_name ?? ''}`.trim() || 'Guest',
            status: g.rsvp_status as RecentRsvp['status'],
            receivedAt: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
          }));

        const weddingDate = demoWeddingSite.wedding_date ?? null;

        setStats({
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
          contactableGuestCount: demoGuests.filter((g) => Boolean(g.email)).length,
          recentRsvps,
          activeSiteRole: 'owner',
          activeSitePermissions: null,
        });
        setNameChangeOverviewState({ hasWorkspace: true, workflowStatus: 'in_progress', hasExecutionActivity: true });
        setNameChangeInsights({
          coreChainLabel: '1 complete · 1 in progress across the legal identity chain.',
          followOnLabel: '1 milestone confirmed so passport, payroll, and tax follow-ons can stay in sync.',
          downstreamLabel: '2 reminders still open for the long-tail bank, insurance, travel, and loyalty cleanup.',
          downstreamHref: '/dashboard/planning?tab=nameChange#target-status-tracking',
          concreteResumeLabel: 'Review the next milestone',
          milestoneSummaryHref: '/dashboard/planning?tab=nameChange#target-status-tracking',
          milestoneSummaryLabel: '1 milestone confirmed',
          reminderSummaryHref: '/dashboard/planning?tab=nameChange#target-status-tracking',
          reminderSummaryLabel: '2 reminders open',
        });
        return;
      }

      const overviewSnapshot = await loadOverviewDashboardSnapshot(user.id);
      const { activeSite, site } = overviewSnapshot;

      let weddingDate: string | null = null;
      let templateName: string | null = null;

      if (site) {
        const weddingData = site.wedding_data as Record<string, unknown> | null;
        const meta = (weddingData?.meta as Record<string, unknown> | undefined) ?? {};
        const persistedDismissals = Array.isArray(meta.intelligenceDismissals)
          ? meta.intelligenceDismissals.filter((id): id is string => typeof id === 'string')
          : [];
        if (persistedDismissals.length > 0) {
          setDismissedIntelligenceIds((current) => {
            const next = Array.from(new Set([...current, ...persistedDismissals]));
            try {
              localStorage.setItem(INTELLIGENCE_DISMISSALS_STORAGE_KEY, JSON.stringify(next));
            } catch {}
            return next;
          });
        }
        weddingDate = resolveWeddingDateFromData(weddingData, {
          wedding_date: site.wedding_date,
          venue_date: site.venue_date,
        });
        templateName = site.template_id ?? null;
        if (isWeddingProfile(site.onboarding_answers)) {
          const summary = getWeddingProfileSummary(site.onboarding_answers);
          setDraftBrief(summary);
          setDraftRefineTargets(getWeddingProfileRefineTargets(site.onboarding_answers));
          setDraftBriefDebug(`valid:${summary.length}`);
        } else {
          const weddingData = (site.wedding_data as Record<string, unknown> | null) ?? null;
          const fallbackCoupleValue = getOverviewFallbackCoupleValue(site.couple_name_1, site.couple_name_2);
          const fallbackSummary = [
            fallbackCoupleValue ? { id: 'couple', label: 'Couple', value: fallbackCoupleValue, questionKey: 'partnerNames' } : null,
            site.wedding_date ? { id: 'date', label: 'Date', value: site.wedding_date, questionKey: 'weddingDate' } : null,
            site.venue_name ? { id: 'venue', label: 'Venue', value: site.venue_name, questionKey: 'venueName' } : null,
            site.wedding_location ? { id: 'location', label: 'Location', value: site.wedding_location, questionKey: 'venueLocation' } : null,
            typeof (weddingData?.couple as Record<string, unknown> | undefined)?.story === 'string' ? { id: 'story', label: 'Story', value: (weddingData?.couple as Record<string, unknown>).story as string, questionKey: 'story' } : null,
          ].filter(Boolean) as Array<{ id: string; label: string; value: string; questionKey: string }>;
          setDraftBrief(fallbackSummary);
          setDraftRefineTargets([]);
          setDraftBriefDebug(`fallback:${fallbackSummary.length}`);
        }
      }

      if (site?.id) {
        const workspace = await loadNameChangeWorkspace(site.id);
        if (workspace.caseRecord) {
          const hydratedWorkspace = hydrateNameChangeWorkspace(workspace);
          const executionCounts = hydratedWorkspace.plan.summary.executionCounts ?? { todo: hydratedWorkspace.plan.steps.length, in_progress: 0, complete: 0 };
          setNameChangeOverviewState({
            hasWorkspace: true,
            workflowStatus: deriveNameChangeLifecycleStatus(hydratedWorkspace.plan),
            hasExecutionActivity: executionCounts.in_progress > 0 || executionCounts.complete > 0,
          });
          setNameChangeInsights(buildNameChangeOverviewInsights(hydratedWorkspace));
        } else {
          setNameChangeOverviewState({ hasWorkspace: false, workflowStatus: null, hasExecutionActivity: false });
          setNameChangeInsights({
            ...DEFAULT_NAME_CHANGE_INSIGHTS,
          });
        }
      } else {
        setNameChangeOverviewState({ hasWorkspace: false, workflowStatus: null, hasExecutionActivity: false });
        setNameChangeInsights({
          ...DEFAULT_NAME_CHANGE_INSIGHTS,
        });
      }

      const siteJson = (site?.site_json as Record<string, unknown> | null) ?? null;
      const privacyMode = 'public';
      const hideFromSearch = siteJson?.hide_from_search === true;
      const isPublished = Boolean(
        site?.is_published === true ||
          siteJson?.publishStatus === 'published' ||
          (typeof siteJson?.publishedVersion === 'number' && (siteJson.publishedVersion as number) > 0)
      );

      setStats({
        siteId: site?.id ?? null,
        publishedVersion: typeof siteJson?.publishedVersion === 'number' ? (siteJson.publishedVersion as number) : null,
        lastPublishedAt: typeof siteJson?.lastPublishedAt === 'string' ? (siteJson.lastPublishedAt as string) : null,
        totalGuests: overviewSnapshot.totalGuests,
        confirmedGuests: overviewSnapshot.confirmedGuests,
        declinedGuests: overviewSnapshot.declinedGuests,
        pendingGuests: overviewSnapshot.pendingGuests,
        daysUntilWedding: calcOverviewDaysUntil(weddingDate),
        weddingDate,
        siteSlug: resolvePublicSiteSlugFromRow((site as unknown as Record<string, unknown> | null) ?? null),
        isPublished,
        privacyMode,
        hideFromSearch,
        siteUpdatedAt: site?.updated_at ?? null,
        templateName,
        coupleName1: site?.couple_name_1 ?? null,
        coupleName2: site?.couple_name_2 ?? null,
        venueName: site?.venue_name ?? null,
        venueLocation: site?.wedding_location ?? null,
        registryItemCount: overviewSnapshot.registryItemCount,
        photoAlbumCount: overviewSnapshot.photoAlbumCount,
        activePhotoAlbumCount: overviewSnapshot.activePhotoAlbumCount,
        vaultCount: overviewSnapshot.vaultCount,
        enabledVaultCount: overviewSnapshot.enabledVaultCount,
        contactableGuestCount: overviewSnapshot.contactableGuestCount,
        recentRsvps: overviewSnapshot.recentRsvps,
        activeSiteRole: activeSite?.role ?? 'owner',
        activeSitePermissions: activeSite?.permissions ?? null,
      });
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
    markBuilderFieldAsUserEdited,
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
        <section className="overflow-hidden rounded-lg border border-border-subtle bg-white">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
            <div className="p-5 md:p-6">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-text-tertiary">
                <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{siteVisibility.label}</span>
                <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{archiveMode.state}</span>
                {stats?.weddingDate && <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{formatOverviewWeddingDate(stats.weddingDate)}</span>}
              </div>
              <div className="mt-6 max-w-3xl">
                <p className="text-xs font-medium text-text-tertiary">Today</p>
                <h1 className="mt-3 text-3xl font-semibold leading-tight text-text-primary md:text-4xl">
                  A calmer place to plan {coupleLabel}.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
                  The essentials are here when you need them: guests, your site, photos, gifts, and the next helpful step.
                </p>
                {heroVenueLine && <p className="mt-3 text-sm font-medium text-text-primary">{heroVenueLine}</p>}
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border-subtle bg-surface-subtle/45 px-4 py-4">
                  <p className="text-xs font-medium text-text-tertiary">RSVPs</p>
                  <p className="mt-2 text-2xl font-semibold text-text-primary">{responseRate ?? 0}%</p>
                  <p className="mt-1 text-xs text-text-secondary">{stats?.confirmedGuests ?? 0} attending · {stats?.pendingGuests ?? 0} pending</p>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-subtle/45 px-4 py-4">
                  <p className="text-xs font-medium text-text-tertiary">Guest contact info</p>
                  <p className="mt-2 text-2xl font-semibold text-text-primary">{contactCoverage ?? 0}%</p>
                  <p className="mt-1 text-xs text-text-secondary">{stats?.contactableGuestCount ?? 0} of {stats?.totalGuests ?? 0} contactable</p>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-subtle/45 px-4 py-4">
                  <p className="text-xs font-medium text-text-tertiary">Site details</p>
                  <p className="mt-2 text-2xl font-semibold text-text-primary">{publishProgress.done}/{publishProgress.total}</p>
                  <p className="mt-1 text-xs text-text-secondary">{publishBlockers.length > 0 ? `${publishBlockers.length} item${publishBlockers.length !== 1 ? 's' : ''} left` : 'Ready items cleared'}</p>
                </div>
              </div>
            </div>
            <aside className="border-t border-border-subtle bg-surface-subtle/35 p-4 md:p-5 lg:border-l lg:border-t-0">
              <div className="flex h-full flex-col justify-between gap-5">
                <div className="overflow-hidden rounded-lg border border-border-subtle bg-white">
                  <img
                    src="/preview-photos/header-anchor.jpg"
                    alt=""
                    className="h-44 w-full object-cover md:h-56"
                    loading="lazy"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-text-tertiary">Worth doing next</p>
                  <h2 className="mt-3 text-xl font-semibold text-text-primary">{nextStepLabel}</h2>
                  <p className="mt-3 text-sm leading-6 text-text-secondary">
                    A gentle nudge based on what is already set up. You can skip it and come back whenever it feels right.
                  </p>
                </div>
                <div className="space-y-3">
                  <Button variant="primary" size="md" fullWidth onClick={nextStepAction}>
                    {nextStepActionLabel}
                  </Button>
                  {stats?.siteSlug && (
                    <Button variant="outline" size="md" fullWidth onClick={() => window.open(`/site/${stats.siteSlug}`, '_blank', 'noopener,noreferrer')}>
                      <ExternalLink className="w-4 h-4 mr-2" aria-hidden="true" />
                      {stats.isPublished ? 'View live site' : 'Preview draft'}
                    </Button>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </section>
        <Card variant="bordered" padding="lg" className="border-border-subtle bg-white">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Palette className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-medium text-text-tertiary">Vendor pages</p>
                <h2 className="mt-1 text-lg font-semibold text-text-primary">Review premium vendor templates</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                  Compare category-specific pages for photographers, florists, venues, catering, beauty, music, planners, and travel vendors.
                </p>
              </div>
            </div>
            <Button variant="outline" size="md" onClick={() => navigate('/vendor-templates')}>
              Open vendor templates
            </Button>
          </div>
        </Card>
        <div className="card-clean px-5 py-4 md:px-6 md:py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium text-text-tertiary">Setup progress</p>
              <p className="text-sm text-text-secondary mt-1">A few pieces help the guest experience feel complete.</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-text-primary">{setupCompletedCount}/{setupChecklist.length}</p>
              <p className="text-xs text-text-tertiary">complete</p>
            </div>
          </div>
          <div className={`mt-4 h-2 rounded-md overflow-hidden ${setupProgressRatio >= 1 ? 'bg-primary' : 'bg-surface-subtle'}`}>
            {setupProgressRatio < 1 && (
              <div
                className="h-full bg-primary transition-[width] duration-300"
                style={{ width: `${Math.max(0, Math.min(1, setupProgressRatio)) * 100}%` }}
              />
            )}
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowMoreDetail((value) => !value)}
            className="rounded-lg border border-border-subtle bg-white/80 px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-border hover:text-text-primary"
          >
            {showMoreDetail ? 'Hide extra detail' : 'Show more detail'}
          </button>
        </div>
        {setupDraftProgressPercent > 0 && setupDraftProgressPercent < 100 && (
          <Card variant="bordered" padding="lg" className="border-border-subtle bg-surface-subtle/45">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">Website setup in progress</p>
                <p className="text-xs text-text-secondary mt-1">You're {setupDraftProgressPercent}% done. Finish setup for stronger defaults.</p>
              </div>
              <button
                onClick={() => navigate('/setup/names')}
                className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary-hover"
              >
                Resume setup
              </button>
            </div>
          </Card>
        )}

        <>
            {calmDigest && calmDigest.items.length > 0 && (
              <Card variant="bordered" padding="lg" className="border-border-subtle bg-white">
                <CardHeader>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <CardTitle>{calmDigest.title}</CardTitle>
                      <CardDescription>{calmDigest.summary}</CardDescription>
                    </div>
                    <Badge variant={calmDigest.attentionCount > 0 ? 'primary' : 'secondary'}>
                      {calmDigest.attentionCount > 0 ? `${calmDigest.attentionCount} to review` : 'Quiet'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {calmDigest.items.slice(0, 6).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigate(item.href)}
                        className="rounded-lg border border-border-subtle bg-surface-subtle/35 px-4 py-4 text-left transition hover:border-primary/30 hover:bg-white"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                            <p className="mt-1 text-xs leading-5 text-text-secondary">{item.detail}</p>
                          </div>
                          <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-[11px] font-medium ${
                            item.priority === 'now'
                              ? 'border-primary/25 bg-primary/10 text-primary'
                              : item.priority === 'soon'
                                ? 'border-border-subtle bg-white text-text-primary'
                                : 'border-border-subtle bg-white text-text-tertiary'
                          }`}>
                            {CALM_DIGEST_PRIORITY_LABELS[item.priority]}
                          </span>
                        </div>
                        <p className="mt-3 text-xs font-semibold text-primary">{item.cta}</p>
                      </button>
                    ))}
                  </div>
                  {calmDigestPreview && (
                    <div className="mt-5 rounded-lg border border-border-subtle bg-surface-subtle/35 px-4 py-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-xs font-medium text-text-tertiary">Digest preview</p>
                          <h3 className="mt-2 text-base font-semibold text-text-primary">{calmDigestPreview.subject}</h3>
                          <p className="mt-1 text-sm leading-6 text-text-secondary">
                            {calmDigestPreview.cadenceLabel} · {calmDigestPreview.audienceLabel} · {calmDigestPreview.statusLabel}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(calmDigestPreview.reviewHref)}
                          className="rounded-lg border border-border-subtle bg-white px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:border-primary/30 hover:text-text-primary"
                        >
                          Review preferences
                        </button>
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {calmDigestPreview.previewLines.slice(0, 4).map((line) => (
                          <p key={line} className="rounded-lg border border-border-subtle bg-white px-3 py-2 text-xs leading-5 text-text-secondary">
                            {line}
                          </p>
                        ))}
                      </div>
                      <p className="mt-3 text-xs leading-5 text-text-tertiary">{calmDigestPreview.safetyNotes.join(' ')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {showMoreDetail && (
            <Card variant="bordered" padding="lg">
              <CardHeader>
                <CardTitle>Guest pulse</CardTitle>
                <CardDescription>A quick read on replies, contact details, gifts, and photo sharing.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-border-subtle bg-surface-secondary/20 px-4 py-4">
                    <p className="text-xs font-medium text-text-tertiary">Replies</p>
                    <p className="mt-1 text-2xl font-bold text-text-primary">{responseRate ?? 0}%</p>
                    <p className="mt-1 text-xs text-text-secondary">Guests who have already answered</p>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-secondary/20 px-4 py-4">
                    <p className="text-xs font-medium text-text-tertiary">Coming</p>
                    <p className="mt-1 text-2xl font-bold text-text-primary">{attendanceRate ?? 0}%</p>
                    <p className="mt-1 text-xs text-text-secondary">Invited guests marked attending</p>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-secondary/20 px-4 py-4">
                    <p className="text-xs font-medium text-text-tertiary">Reachable guests</p>
                    <p className="mt-1 text-2xl font-bold text-text-primary">{contactCoverage ?? 0}%</p>
                    <p className="mt-1 text-xs text-text-secondary">Guests with email or phone on file</p>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-secondary/20 px-4 py-4">
                    <p className="text-xs font-medium text-text-tertiary">Registry</p>
                    <p className="mt-1 text-2xl font-bold text-text-primary">{stats?.registryItemCount ?? 0}</p>
                    <p className="mt-1 text-xs text-text-secondary">Live registry items ready for guests</p>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-3">
                  <div className="rounded-lg border border-border-subtle bg-white px-4 py-4">
                    <p className="text-sm font-semibold text-text-primary">RSVPs</p>
                    <div className="mt-3 space-y-2 text-sm text-text-secondary">
                      <div className="flex items-center justify-between gap-3"><span>Confirmed</span><span className="font-semibold text-text-primary">{stats?.confirmedGuests ?? 0}</span></div>
                      <div className="flex items-center justify-between gap-3"><span>Declined</span><span className="font-semibold text-text-primary">{stats?.declinedGuests ?? 0}</span></div>
                      <div className="flex items-center justify-between gap-3"><span>Pending</span><span className="font-semibold text-text-primary">{stats?.pendingGuests ?? 0}</span></div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-white px-4 py-4">
                    <p className="text-sm font-semibold text-text-primary">Registry and photos</p>
                    <div className="mt-3 space-y-2 text-sm text-text-secondary">
                      <div className="flex items-center justify-between gap-3"><span>Registry items</span><span className="font-semibold text-text-primary">{stats?.registryItemCount ?? 0}</span></div>
                      <div className="flex items-center justify-between gap-3"><span>Photo albums</span><span className="font-semibold text-text-primary">{stats?.activePhotoAlbumCount ?? 0}/{stats?.photoAlbumCount ?? 0}</span></div>
                      <div className="flex items-center justify-between gap-3"><span>Guest prompts</span><span className="font-semibold text-text-primary">{interactiveSuggestions.length}</span></div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-white px-4 py-4">
                    <p className="text-sm font-semibold text-text-primary">Worth checking</p>
                    <div className="mt-3 space-y-2 text-sm text-text-secondary">
                      <p>{(stats?.pendingGuests ?? 0) > 0 ? `${stats?.pendingGuests ?? 0} guests still need an RSVP reply.` : 'RSVP backlog is clear right now.'}</p>
                      <p>{(stats?.contactableGuestCount ?? 0) < (stats?.totalGuests ?? 0) ? `${(stats?.totalGuests ?? 0) - (stats?.contactableGuestCount ?? 0)} guests still need email or phone details.` : 'Guest contact details look complete.'}</p>
                      <p>{(stats?.registryItemCount ?? 0) === 0 ? 'Add a few registry items before guests visit.' : 'Registry is ready for guests.'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            )}

            {showMoreDetail && launchReadiness && (
              <Card variant="bordered" padding="lg" className="border-border-subtle bg-surface">
                <CardHeader>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <CardTitle>Ready check</CardTitle>
                      <CardDescription>{launchReadiness.headline}</CardDescription>
                    </div>
                    <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 px-4 py-3 text-right">
                      <p className="text-xs font-medium text-text-tertiary">Ready</p>
                      <p className="mt-1 text-3xl font-semibold text-text-primary">{launchReadiness.score}%</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {launchReadiness.nextItem && (
                    <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-4 py-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                      <p className="text-xs font-medium text-text-tertiary">Worth doing next</p>
                          <p className="mt-1 text-base font-semibold text-text-primary">{launchReadiness.nextItem.label}</p>
                          <p className="mt-1 text-sm text-text-secondary">{launchReadiness.nextItem.detail}</p>
                        </div>
                        <Button variant="accent" size="sm" onClick={() => navigate(launchReadiness.nextItem!.href)}>
                          {launchReadiness.nextItem.nextAction}
                        </Button>
                      </div>
                    </div>
                  )}

                  {planningAssistant && planningAssistant.actions.length > 0 && (
                    <div className="rounded-lg border border-border-subtle bg-white px-4 py-4">
                      <p className="text-xs font-medium text-text-tertiary">Helpful next steps</p>
                      <p className="mt-1 text-sm text-text-secondary">{planningAssistant.headline}</p>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {planningAssistant.actions.map((action) => (
                          <button
                            key={action.id}
                            type="button"
                            onClick={() => navigate(action.href)}
                            className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-3 text-left transition hover:border-primary/25 hover:bg-white"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-semibold text-text-primary">{action.title}</p>
                              <span className={`rounded-lg px-2 py-0.5 text-[11px] font-medium ${
                                action.tone === 'urgent'
                                  ? 'border border-border-subtle bg-white text-text-primary'
                                  : action.tone === 'important'
                                    ? 'border border-border-subtle bg-white text-text-secondary'
                                    : 'border border-border-subtle bg-white text-text-tertiary'
                              }`}>
                                {action.tone === 'urgent' ? 'Now' : action.tone === 'important' ? 'Soon' : 'Ready'}
                              </span>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-text-secondary">{action.detail}</p>
                            <p className="mt-2 text-xs font-semibold text-primary">{action.cta}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    {launchReadiness.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigate(item.href)}
                        className="rounded-lg border border-border-subtle bg-white px-4 py-4 text-left transition hover:border-primary/25"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                          <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${
                            item.status === 'ready'
                              ? 'border border-border-subtle bg-surface-subtle text-text-secondary'
                              : item.status === 'needs_attention'
                                ? 'border border-border-subtle bg-white text-text-primary'
                                : 'border border-border-subtle bg-surface-subtle text-text-tertiary'
                          }`}>
                            {item.score}%
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-text-secondary">{item.nextAction}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {showMoreDetail && invisibleSuggestions.length > 0 && (
              <Card variant="bordered" padding="lg">
                <CardHeader>
                  <CardTitle>Quiet suggestions</CardTitle>
                  <CardDescription>Small next moves based on the site, guests, photos, registry, messages, and vault.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {invisibleSuggestions.slice(0, 4).map((suggestion) => (
                      <div key={suggestion.id} className="rounded-lg border border-border-subtle bg-white px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="rounded-lg border border-border-subtle bg-surface-subtle px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
                              {suggestion.priority === 'now' ? 'Do now' : suggestion.priority === 'next' ? 'Next' : 'Polish'}
                            </span>
                            <p className="mt-3 text-sm font-semibold text-text-primary">{suggestion.title}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => dismissInvisibleSuggestion(suggestion.id)}
                            className="text-xs font-medium text-text-tertiary hover:text-text-primary"
                            aria-label={`Hide ${suggestion.title}`}
                          >
                            Hide
                          </button>
                        </div>
                        <p className="mt-2 min-h-[52px] text-xs leading-5 text-text-secondary">{suggestion.detail}</p>
                        <Button
                          variant={suggestion.priority === 'now' ? 'accent' : 'outline'}
                          size="sm"
                          className="mt-3 w-full"
                          onClick={() => {
                            if (suggestion.href) navigate(suggestion.href);
                          }}
                        >
                          {suggestion.actionLabel}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {showMoreDetail && draftBrief.length > 0 && (
              <Card variant="bordered" padding="lg">
                <CardHeader>
                  <CardTitle>Wedding brief</CardTitle>
                  <CardDescription>The answers currently shaping your wedding site.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {draftBrief.map((item) => (
                      <div key={item.id} className="rounded-lg border border-border-subtle bg-white px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs text-text-tertiary">{item.label}</p>
                            <p className="mt-1 text-sm text-text-primary">{item.value}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof window !== 'undefined') {
                                writeOnboardingResumeTarget(item.questionKey);
                              }
                              navigate('/onboarding');
                            }}
                            className="text-xs font-medium text-primary hover:text-primary-hover"
                          >
                            Refine
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="accent"
                      size="sm"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          writeOnboardingResumeTarget('first-incomplete');
                        }
                        navigate('/onboarding');
                      }}
                    >
                      Resume concierge
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => refreshDraftFromBrief()} disabled={refreshingBrief}>
                      {refreshingBrief ? 'Refreshing draft...' : 'Refresh draft from brief'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {showMoreDetail && (
            <Card variant="bordered" padding="lg" className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{archiveMode.label}</CardTitle>
                    <CardDescription>{archiveMode.detail}</CardDescription>
                  </div>
                  <Badge variant={archiveMode.isArchiveLike ? 'warning' : 'secondary'}>{archiveMode.state}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border-subtle bg-surface-secondary/20 px-3 py-3">
                    <p className="text-sm font-medium text-text-primary">Planning first</p>
                    <p className="mt-1 text-xs text-text-secondary">Before the wedding, planning, guests, RSVP, seating, and live coordination stay in the foreground.</p>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-secondary/20 px-3 py-3">
                    <p className="text-sm font-medium text-text-primary">A calmer shift after the wedding</p>
                    <p className="mt-1 text-xs text-text-secondary">After the event, planning prompts quiet down and memories become easier to revisit.</p>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-secondary/20 px-3 py-3">
                    <p className="text-sm font-medium text-text-primary">Vault grows over time</p>
                    <p className="mt-1 text-xs text-text-secondary">The anniversary vault and memory surfaces should start carrying more weight once the event is over.</p>
                  </div>
                </div>
                {archiveMode.isArchiveLike && (
                  <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 px-4 py-4 space-y-3">
                    <div>
                        <p className="text-sm font-medium text-text-primary">Your keepsake view is ready</p>
                        <p className="mt-1 text-sm text-text-secondary">This is where dayof starts feeling less like planning and more like a keepsake: fewer urgent prompts, more story, photos, and anniversary memories.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="rounded-lg border border-border-subtle bg-white px-3 py-3">
                        <p className="text-xs font-medium text-text-tertiary">Come back next</p>
                        <p className="mt-1 text-xs text-text-secondary">Add one anniversary note while the wedding is still fresh.</p>
                      </div>
                      <div className="rounded-lg border border-border-subtle bg-white px-3 py-3">
                        <p className="text-xs font-medium text-text-tertiary">Keep alive</p>
                        <p className="mt-1 text-xs text-text-secondary">Collect the best guest photos and keep the public story worth revisiting.</p>
                      </div>
                      <div className="rounded-lg border border-border-subtle bg-white px-3 py-3">
                        <p className="text-xs font-medium text-text-tertiary">Return later</p>
                        <p className="mt-1 text-xs text-text-secondary">Let anniversaries unlock memories without rebuilding the whole context each year.</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/vault')}>Open anniversary notes</Button>
                      <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/photos')}>Open photo sharing</Button>
                      <Button variant="outline" size="sm" onClick={() => stats?.siteSlug && window.open(`/site/${stats.siteSlug}`, '_blank', 'noopener,noreferrer')}>Revisit public site</Button>
                    </div>
                  </div>
                )}

                {archiveMode.isArchiveLike && (
                  <div className="rounded-lg border border-border-subtle bg-white px-4 py-4 space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">Private archive home</p>
                      <p className="mt-1 text-sm text-text-secondary">After the wedding, this becomes memories first and planning details second.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 px-4 py-3">
                        <p className="text-xs text-text-tertiary">Memory layer</p>
                        <p className="mt-1 text-sm text-text-secondary">Open anniversary notes, add one message, and keep future milestones alive.</p>
                      </div>
                      <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 px-4 py-3">
                        <p className="text-xs text-text-tertiary">Photo memory</p>
                        <p className="mt-1 text-sm text-text-secondary">Review guest uploads and turn the best moments into a slideshow keepsake.</p>
                      </div>
                      <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 px-4 py-3">
                        <p className="text-xs text-text-tertiary">Keepsake site</p>
                        <p className="mt-1 text-sm text-text-secondary">Revisit the public story without throwing planning urgency back in your face.</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="accent" size="sm" onClick={() => navigate('/dashboard/vault')}>Open anniversary notes</Button>
                      <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/photos')}>Open photo memories</Button>
                      <Button variant="outline" size="sm" onClick={() => stats?.siteSlug && window.open(`/site/${stats.siteSlug}`, '_blank', 'noopener,noreferrer')}>Open keepsake site</Button>
                    </div>
                  </div>
                )}

                {archiveMode.isArchiveLike && (
                  <div className="rounded-lg border border-border-subtle bg-surface-subtle/35 px-4 py-4 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">Post-wedding name change assistant</p>
                        <p className="mt-1 text-xs text-text-tertiary">Free assistant · saved status · document checklist</p>
                        <p className="mt-1 text-base font-semibold text-text-primary">{nameChangeCard.headline}</p>
                        <p className="mt-1 text-sm text-text-secondary">{nameChangeCard.helperCopy}</p>
                      </div>
                      <Badge variant="secondary">{nameChangeCard.badgeLabel}</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-lg border border-border-subtle bg-white px-4 py-3">
                        <p className="text-xs text-text-tertiary">Optional next step</p>
                        <p className="mt-1 text-sm font-semibold text-text-primary">{nameChangeCard.optionalNextStep}</p>
                        <p className="mt-1 text-xs text-text-secondary">{nameChangeCard.statusLabel}</p>
                        {nameChangeInsights.concreteResumeLabel ? (
                          <p className="mt-1 text-xs text-text-secondary">
                            If you want a concrete place to pick back up,{' '}
                            <button
                              type="button"
                              className="font-medium text-primary underline underline-offset-2"
                              onClick={() => navigate(nameChangeCard.plannerHref)}
                            >
                              {nameChangeInsights.concreteResumeLabel}
                            </button>
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-text-secondary">
                          <button
                            type="button"
                            className="rounded-lg border border-border-subtle bg-surface-subtle px-2 py-1 font-medium"
                            onClick={() => navigate(nameChangeInsights.milestoneSummaryHref)}
                          >
                            {nameChangeInsights.milestoneSummaryLabel}
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-border-subtle bg-surface-subtle px-2 py-1 font-medium"
                            onClick={() => navigate(nameChangeInsights.reminderSummaryHref)}
                          >
                            {nameChangeInsights.reminderSummaryLabel}
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="rounded-lg border border-border-subtle bg-white px-4 py-3 text-left"
                        onClick={() => navigate(nameChangeCard.plannerHref)}
                      >
                        <p className="text-xs text-text-tertiary">{NAME_CHANGE_LIFECYCLE_LABELS.coreChain}</p>
                        <p className="mt-1 text-sm text-text-primary">{nameChangeInsights.coreChainLabel}</p>
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-border-subtle bg-white px-4 py-3 text-left"
                        onClick={() => navigate(nameChangeCard.plannerHref)}
                      >
                        <p className="text-xs text-text-tertiary">{NAME_CHANGE_LIFECYCLE_LABELS.followOn}</p>
                        <p className="mt-1 text-sm text-text-primary">{nameChangeInsights.followOnLabel}</p>
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-border-subtle bg-white px-4 py-3 text-left"
                        onClick={() => navigate(nameChangeInsights.downstreamHref)}
                      >
                        <p className="text-xs text-text-tertiary">{NAME_CHANGE_LIFECYCLE_LABELS.downstream}</p>
                        <p className="mt-1 text-sm text-text-primary">{nameChangeInsights.downstreamLabel}</p>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="accent" size="sm" onClick={() => navigate(nameChangeCard.primaryHref)}>
                        {nameChangeCard.primaryLabel}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(nameChangeCard.secondaryHref)}>
                        {nameChangeCard.secondaryLabel}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(nameChangeCard.tertiaryHref)}>
                        {nameChangeCard.tertiaryLabel}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => navigate(nameChangeCard.plannerHref)}>
                        {nameChangeCard.plannerLabel}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            )}


            {showInternalProof && (
            <Card variant="bordered" padding="lg" className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>Migration proof</CardTitle>
                    <CardDescription>Switching should feel structured, not like a total rebuild.</CardDescription>
                  </div>
                  <Badge variant="secondary">Migration-ready</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border-subtle bg-surface-secondary/20 px-3 py-3">
                    <p className="text-sm font-medium text-text-primary">Guest import has review truth</p>
                    <p className="mt-1 text-xs text-text-secondary">Imports now show weaker mappings, duplicate-name flags, household merge warnings, and what still needs review.</p>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-secondary/20 px-3 py-3">
                    <p className="text-sm font-medium text-text-primary">Content recovery is shaping up</p>
                    <p className="mt-1 text-xs text-text-secondary">Story, event details, FAQs, and registry links have extra helpers so older site details stay easy to reuse.</p>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-secondary/20 px-3 py-3">
                    <p className="text-sm font-medium text-text-primary">Publish is still review-based</p>
                    <p className="mt-1 text-xs text-text-secondary">The product now tells you what to verify before publishing so migration does not feel like guess-and-hope.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            )}

            {showInternalProof && (
            <Card variant="bordered" padding="lg" className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>Planner handoff</CardTitle>
                    <CardDescription>Share the right pieces with the people helping you, without turning the whole wedding into a control panel.</CardDescription>
                  </div>
                  <Badge variant="warning">Planner-ready</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border-subtle bg-surface-secondary/20 px-3 py-3">
                    <p className="text-sm font-medium text-text-primary">Planner view</p>
                    <p className="mt-1 text-xs text-text-secondary">Run timeline updates, guest questions, check-in, and day-of alerts from one place the couple can share gracefully.</p>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-secondary/20 px-3 py-3">
                    <p className="text-sm font-medium text-text-primary">RSVP + guests</p>
                    <p className="mt-1 text-xs text-text-secondary">Move from invite status into follow-up and arrival decisions without switching tools.</p>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-secondary/20 px-3 py-3">
                    <p className="text-sm font-medium text-text-primary">Seating + live access</p>
                    <p className="mt-1 text-xs text-text-secondary">Keep table assignments and guest lookup ready for the people actually running the event.</p>
                  </div>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-secondary/20 px-3 py-2.5 text-xs text-text-secondary">
                  Helper access starts in Settings, shared planning views exist across the main planning screens, and role boundaries are tighter than a generic shared login.
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="accent" size="md" onClick={() => navigate('/dashboard/coordinator')}>
                    <Radio className="w-4 h-4 mr-2" aria-hidden="true" />
                    Open day-of view
                  </Button>
                  <Button variant="outline" size="md" onClick={() => navigate('/dashboard/planning')}>
                    <Radio className="w-4 h-4 mr-2" aria-hidden="true" />
                    Open planning
                  </Button>
                  <Button variant="outline" size="md" onClick={() => navigate('/dashboard/rsvp-board')}>
                    <Users className="w-4 h-4 mr-2" aria-hidden="true" />
                    Open RSVP board
                  </Button>
                  <Button variant="outline" size="md" onClick={() => navigate('/dashboard/seating-lookup')}>
                    <Eye className="w-4 h-4 mr-2" aria-hidden="true" />
                    Open seating lookup
                  </Button>
                </div>
              </CardContent>
            </Card>
            )}
              <Card variant="bordered" padding="lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Your wedding site</CardTitle>
                      <CardDescription>
                        {publishState.explainer}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={publishBadgeVariant}>{publishState.label}</Badge>
                      {typeof stats?.publishedVersion === 'number' && <Badge variant="secondary">v{stats.publishedVersion}</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats?.siteSlug ? (
                    <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                      <span className="text-text-secondary">Site URL</span>
                      <a href={`/site/${stats.siteSlug}`} className="text-primary hover:text-primary-hover flex items-center gap-2 text-sm font-medium">
                        {stats.siteSlug}.dayof.love
                        <ExternalLink className="w-4 h-4" aria-hidden="true" />
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                      <span className="text-text-secondary">Site URL</span>
                      <span className="text-text-tertiary text-sm">Not set</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                    <span className="text-text-secondary">Status</span>
                    <span className="text-text-primary">{siteVisibility.label}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                    <span className="text-text-secondary">Last live update</span>
                    <span className="text-text-primary">{stats?.lastPublishedAt ? formatOverviewRelativeTime(stats.lastPublishedAt) : '—'}</span>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-secondary/30 px-3 py-2.5 text-sm">
                    <p className="font-medium text-text-primary">{publishState.label}</p>
                    <p className="mt-1 text-text-secondary">{publishState.explainer}</p>
                    {recentSiteActivity.some((activity) => activity.action === 'publish') && (
                      <p className="mt-2 text-xs text-text-tertiary">Recent publish activity is listed below so you can verify what happened before trying again.</p>
                    )}
                  </div>

                  <details className="rounded-lg border border-border-subtle bg-surface-secondary/30 px-3 py-2.5">
                    <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-text-secondary">Site details</span>
                      <span className="text-[11px] text-text-tertiary">{publishProgress.done}/{publishProgress.total} ready</span>
                    </summary>
                    <div className="mt-3 space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-border-subtle">
                        <span className="text-text-secondary text-sm">Template</span>
                        <span className="text-text-primary font-medium capitalize text-sm">{stats?.templateName?.replace(/-/g, ' ') ?? 'Default'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-border-subtle">
                        <span className="text-text-secondary text-sm">Published version</span>
                        <span className="text-text-primary font-medium text-sm">{typeof stats?.publishedVersion === 'number' ? `v${stats.publishedVersion}` : '—'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-text-secondary text-sm">Last updated</span>
                        <span className="text-text-primary text-sm">{stats?.siteUpdatedAt ? formatOverviewRelativeTime(stats.siteUpdatedAt) : '—'}</span>
                      </div>

                      {!stats?.isPublished && (
                        <div className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2.5 text-xs text-text-secondary">
                          Going live makes this site visible to guests at your guest-facing dayof URL. Until then, it should stay in draft or intentional private-preview mode only.
                        </div>
                      )}

                      {firstPublishBlocker?.route && (
                        <button
                          type="button"
                          onClick={() => navigate(firstPublishBlocker.route)}
                          className="w-full rounded border border-border-subtle bg-white px-3 py-1.5 text-xs font-medium text-text-primary hover:border-primary/25 hover:bg-surface-subtle"
                        >
                          Fix next: {firstPublishBlocker.label}
                        </button>
                      )}
                    </div>
                  </details>
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    {stats?.siteSlug && (
                      <Button variant="accent" size="md" fullWidth onClick={() => window.open(`/site/${stats.siteSlug}`, '_blank', 'noopener,noreferrer')}>
                        <ExternalLink className="w-5 h-5 mr-2" aria-hidden="true" />
                        {stats.isPublished ? 'Open live website' : 'Preview draft website'}
                      </Button>
                    )}
                    <Button variant="outline" size="md" fullWidth onClick={() => navigate('/dashboard/builder?photoTips=1')}>
                      <Edit className="w-5 h-5 mr-2" aria-hidden="true" />
                      {stats?.isPublished ? 'Edit published website' : 'Edit draft before you share'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {showMoreDetail && (
              <Card variant="bordered" padding="lg">
                <CardHeader>
                  <CardTitle>Recent RSVPs</CardTitle>
                  <CardDescription>Latest responses from your guests</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats?.recentRsvps && stats.recentRsvps.length > 0 ? (
                    <div className="space-y-4">
                      {stats.recentRsvps.map((rsvp) => (
                        <div key={rsvp.id} className="flex gap-4">
                          <div className={`w-2 h-2 rounded-sm mt-2 flex-shrink-0 ${isAttendingRsvpStatus(rsvp.status) ? 'bg-success' : 'bg-error'}`} />
                          <div className="flex-1">
                            <p className="text-sm text-text-primary font-medium">{rsvp.guestName}</p>
                            <p className="text-xs text-text-secondary">{isAttendingRsvpStatus(rsvp.status) ? 'Confirmed attendance' : 'Declined'}</p>
                            <p className="text-xs text-text-tertiary mt-1">{formatOverviewRelativeTime(rsvp.receivedAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Eye className="w-10 h-10 text-text-tertiary mb-3" />
                      <p className="text-sm text-text-secondary mb-1">No RSVPs yet</p>
                      <p className="text-xs text-text-tertiary mb-3">RSVP totals will appear here automatically as guests respond.</p>
                      <Link to="/dashboard/guests" className="text-xs text-primary hover:text-primary-hover font-medium transition-colors">
                        Invite guests →
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
              )}

              {showMoreDetail && (
              <Card variant="bordered" padding="lg">
                <CardHeader>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <CardTitle>Website and invite analytics</CardTitle>
                      <CardDescription>{websiteInviteAnalytics.summary}</CardDescription>
                    </div>
                    <Badge variant={websiteInviteAnalytics.status === 'ready' ? 'success' : websiteInviteAnalytics.status === 'empty' ? 'secondary' : 'warning'}>
                      {websiteInviteAnalytics.measuredCount} usable · {websiteInviteAnalytics.plannedCount} planned
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {websiteInviteAnalytics.signals.map((signal) => (
                      <div key={signal.id} className="rounded-lg border border-border-subtle bg-surface-secondary/20 px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-text-tertiary">{signal.label}</p>
                            <p className="mt-1 text-xl font-semibold text-text-primary">{signal.value}</p>
                          </div>
                          <Badge variant={signal.state === 'measured' ? 'success' : signal.state === 'derived' ? 'warning' : 'secondary'}>
                            {signal.state === 'measured' ? 'Measured' : signal.state === 'derived' ? 'Derived' : 'Planned'}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-text-secondary">{signal.detail}</p>
                        <p className="mt-2 text-[11px] leading-4 text-text-tertiary">{signal.privacy}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-secondary/25 px-3 py-2 text-xs leading-5 text-text-secondary">
                    Analytics shown here are limited to owner-visible action counts. Visit tracking, invite opens, and QR scans stay marked planned until privacy-safe event instrumentation exists.
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface px-3 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">Guest journey funnel</p>
                        <p className="mt-1 text-xs text-text-secondary">{websiteInviteAnalyticsFunnel.summary}</p>
                      </div>
                      <Badge variant={websiteInviteAnalyticsFunnel.status === 'ready' ? 'success' : websiteInviteAnalyticsFunnel.status === 'empty' ? 'secondary' : 'warning'}>
                        {websiteInviteAnalyticsFunnel.measuredSteps} real · {websiteInviteAnalyticsFunnel.plannedSteps} planned
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-5">
                      {websiteInviteAnalyticsFunnel.steps.map((step) => (
                        <div key={step.id} className="rounded-lg border border-border-subtle bg-surface-secondary/20 px-3 py-2">
                          <p className="text-[11px] font-semibold text-text-tertiary">{step.label}</p>
                          <p className="mt-1 text-sm font-semibold text-text-primary">{step.value}</p>
                          <p className="mt-1 text-[11px] leading-4 text-text-secondary">{step.detail}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 space-y-1">
                      {websiteInviteAnalyticsFunnel.guardrails.map((guardrail) => (
                        <p key={guardrail} className="text-[11px] leading-4 text-text-tertiary">{guardrail}</p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
              )}

              {showInternalProof && (
                <>
                  <Card variant="bordered" padding="lg">
                    <CardHeader>
                      <CardTitle>Proof baseline</CardTitle>
                      <CardDescription>Only measured product signals shown here. No guessed conversion metrics.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="rounded-lg border border-border-subtle bg-surface-secondary/30 px-3 py-2.5 text-xs text-text-secondary">
                        This is the clean baseline before fuller analytics lands: response counts, registry readiness, photo setup, and guest prompts.
                      </div>
                      <div className="space-y-2.5">
                        {analyticsBaseline.map((metric) => (
                          <div key={metric.label} className="rounded-lg border border-border-subtle bg-surface-secondary/20 px-3 py-2.5">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-text-primary">{metric.label}</p>
                              <div className="flex items-center gap-2">
                                <Badge variant={metric.source === 'measured' ? 'success' : 'warning'}>{metric.source === 'measured' ? 'Measured' : 'Derived'}</Badge>
                                <span className="text-sm font-semibold text-text-primary">{metric.value}</span>
                              </div>
                            </div>
                            <p className="mt-1 text-xs text-text-secondary">{metric.detail}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card variant="bordered" padding="lg">
                    <CardHeader>
                      <CardTitle>Recent site activity</CardTitle>
                      <CardDescription>Latest local save, publish, and rollback events from this browser session history.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {recentSiteActivity.length === 0 ? (
                        <div className="text-sm text-text-secondary">No local site activity recorded here yet.</div>
                      ) : (
                        <div className="space-y-3">
                          {recentSiteActivity.map((activity) => (
                            <div key={activity.id} className="rounded-lg border border-border-subtle bg-surface-secondary/30 px-3 py-2.5">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium text-text-primary capitalize">{activity.action === 'publish' ? 'Published live site' : activity.action === 'rollback' ? 'Restored older version' : 'Saved draft'}</p>
                                  <p className="mt-0.5 text-[11px] text-text-tertiary">{formatOverviewRelativeTime(activity.createdAtISO)} • {activity.actor}</p>
                                </div>
                                <Badge variant={activity.action === 'publish' ? 'success' : activity.action === 'rollback' ? 'warning' : 'secondary'}>
                                  {activity.action}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-3 rounded-lg border border-border-subtle bg-surface-secondary/20 px-3 py-2 text-xs text-text-secondary">
                        This gives you a simple recent history here. Deeper shared activity history lives in Settings.
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {showMoreDetail && (
              <Card variant="bordered" padding="lg">
                <CardHeader>
                  <CardTitle>Interactive suggestions</CardTitle>
                  <CardDescription>Latest guest prompt responses (moderation)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-5 rounded-lg border border-border-subtle bg-surface-secondary/25 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">Poll and quiz results</p>
                        <p className="mt-0.5 text-xs text-text-secondary">Guest votes grouped by interactive widget.</p>
                      </div>
                      <Radio className="h-4 w-4 text-primary" />
                    </div>
                    {interactiveLoading ? (
                      <div className="mt-4 text-sm text-text-secondary">Loading guest votes…</div>
                    ) : interactiveVoteSummaries.length === 0 ? (
                      <div className="mt-4 text-sm text-text-secondary">No poll or quiz votes yet.</div>
                    ) : (
                      <div className="mt-4 space-y-4">
                        {interactiveVoteSummaries.slice(0, 4).map((summary) => (
                          <div key={summary.key} className="rounded-lg border border-border-subtle bg-surface px-3 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-semibold text-text-tertiary">{summary.widgetKind}</p>
                                <p className="mt-0.5 text-sm font-medium text-text-primary">{formatInteractiveVoteLabel(summary.widgetId)}</p>
                              </div>
                              <Badge variant="secondary">{summary.total} vote{summary.total === 1 ? '' : 's'}</Badge>
                            </div>
                            <div className="mt-3 space-y-2">
                              {summary.options.slice(0, 5).map((option) => (
                                <div key={option.optionId}>
                                  <div className="flex items-center justify-between gap-3 text-xs text-text-secondary">
                                    <span>{formatInteractiveVoteLabel(option.optionId)}</span>
                                    <span>{option.percentage}%</span>
                                  </div>
                                  <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-surface-secondary">
                                    <div className="h-full rounded-sm bg-primary" style={{ width: `${option.percentage}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p className="mt-2 text-[11px] text-text-tertiary">Last vote {formatOverviewRelativeTime(summary.latestAt)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {interactiveLoading ? (
                    <div className="text-sm text-text-secondary">Loading suggestions…</div>
                  ) : interactiveSuggestions.length === 0 ? (
                    <div className="text-sm text-text-secondary">No suggestions yet.</div>
                  ) : (
                    <div className="space-y-2.5">
                      {interactiveSuggestions.map((item) => (
                        <div key={item.id} className="rounded-lg border border-border-subtle bg-surface-secondary/30 px-3 py-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-text-primary">{item.suggestion_text}</p>
                            <button
                              type="button"
                              onClick={() => hideSuggestion(item.id)}
                              className="inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-1 text-[11px] text-text-secondary hover:bg-surface"
                            >
                              <EyeOff className="w-3 h-3" />
                              Hide
                            </button>
                          </div>
                          <p className="mt-1 text-[11px] text-text-tertiary">{formatOverviewRelativeTime(item.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              )}
            </div>
        </>
    </OverviewDashboardRouteView>
  );
};
