import React, { useEffect, useState } from 'react';
import { readSetupDraft, setupDraftProgress } from '../../lib/setupDraft';
import { SITE_VISIBILITY_COPY } from '../../lib/siteVisibilityCopy';
import {
  buildPublishReadinessItems,
  buildSetupChecklist,
  getArchivePhotoMemoryCopy,
  getChecklistProgress,
  getFirstIncompleteChecklistItem,
  getIncompleteChecklistItems,
} from './overviewUtils';
import { buildAnalyticsBaseline, buildAnalyticsConfidenceCards, buildAnalyticsConfidenceSummary, buildAnalyticsNextMove } from './analyticsBaseline';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { DashboardStateBlock } from '../../components/dashboard/DashboardStateBlock';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '../../components/ui';
import { Eye, Users, CheckCircle2, Calendar, ExternalLink, Edit, Clock, EyeOff, Radio } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { buildDraftSitePatchFromProfile, getWeddingProfileSummary, isWeddingProfile } from '../../lib/weddingProfile';
import { generateDraftFromWeddingProfile, mergeGeneratedDraftIntoWeddingData } from '../../lib/aiDraftGenerator';
import { mergeGeneratedDraftIntoBuilderProject } from '../../lib/aiBuilderProjectPatch';
import { createCanonicalContentFromDraft } from '../../lib/aiCanonicalContent';
import { useAuth } from '../../hooks/useAuth';
import { demoWeddingSite, demoGuests, demoEvents } from '../../lib/demoData';
import { resolvePublicSiteSlugFromRow } from '../../lib/publicSiteSlug';
import { getSiteVisibilityState } from '../../lib/siteVisibilityState';
import { getPublishStateDescriptor } from '../../lib/publishState';
import type { BuilderRevision } from '../../builder/services/versionHistory';
import { getArchiveModeDescriptor } from '../../lib/archiveMode';
import { hasRespondedRsvpStatus, isAttendingRsvpStatus, isDeclinedRsvpStatus, isPendingRsvpStatus } from '../../lib/rsvpStatus';
import { writeOnboardingResumeTarget } from '../../lib/onboardingResumeStorage';
import { useToast } from '../../components/ui/Toast';
import { buildGuestOpsCoach } from '../../lib/guestOpsCoach';
import { calcOverviewDaysUntil, formatOverviewRelativeTime, formatOverviewWeddingDate, getOverviewTimestamp } from './overviewDate';
import { getOverviewFallbackCoupleValue } from './overviewDraftBrief';
import { buildNameChangeOverviewCardModel } from './nameChangeOverviewCard';
import { buildNameChangeOverviewInsights, type NameChangeOverviewInsights } from './nameChangeOverviewInsights';
import { NAME_CHANGE_LIFECYCLE_LABELS } from './nameChangeLifecycleLabels';
import { deriveNameChangeLifecycleStatus } from './nameChangeLifecycleStatus';
import { hydrateNameChangeWorkspace, loadNameChangeWorkspace } from './planning/nameChangeService';
import { buildControlTowerBriefing, type ControlTowerAction } from './controlTowerIntelligence';
import { ControlTowerBriefingCard } from './ControlTowerBriefingCard';
import { buildDayOfBrainBriefing, type DayOfBrainAction } from './dayOfBrain';
import { DayOfBrainCard } from './DayOfBrainCard';
import { buildCoupleFocusModel, type CoupleFocusStep } from './coupleFocus';
import { buildOverviewThroughline } from './overviewThroughline';
import { getFlowStatusLabel } from '../../lib/flowLabels';

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

interface OverviewStats {
  siteId: string | null;
  publishedVersion: number | null;
  lastPublishedAt: string | null;
  totalGuests: number;
  confirmedGuests: number;
  declinedGuests: number;
  pendingGuests: number;
  itineraryEventCount: number;
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
  contactableGuestCount: number;
  recentRsvps: RecentRsvp[];
}

interface RecentRsvp {
  id: string;
  guestName: string;
  status: 'confirmed' | 'declined' | 'accepted' | 'attending' | 'not_attending';
  receivedAt: string;
}

interface InteractiveSuggestion {
  id: string;
  suggestion_text: string;
  created_at: string;
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

  async function refreshDraftFromBrief() {    if (!stats?.siteId || draftBrief.length === 0 || refreshingBrief) return;

    setRefreshingBrief(true);
    try {
      const { data, error } = await supabase
        .from('wedding_sites')
        .select('onboarding_answers, site_json, wedding_data')
        .eq('id', stats.siteId)
        .maybeSingle();

      if (error) throw error;
      if (!isWeddingProfile(data?.onboarding_answers)) throw new Error('No saved brief found');

      const patch = buildDraftSitePatchFromProfile(data.onboarding_answers);
      const generatedDraft = await generateDraftFromWeddingProfile(data.onboarding_answers);
      const canonicalAiContent = createCanonicalContentFromDraft(generatedDraft);
      const mergedWeddingData = await mergeGeneratedDraftIntoWeddingData(
        (data.wedding_data as Record<string, unknown> | null) ?? null,
        data.onboarding_answers
      ) as Record<string, unknown>;
      const existingSiteJson = ((data.site_json as Record<string, unknown> | null) ?? {});
      const cleanedSiteJson = { ...existingSiteJson };
      if ('home' in cleanedSiteJson) {
        delete cleanedSiteJson.home;
      }
      const existingAiContent = ((((data.wedding_data as Record<string, unknown> | null)?.meta as Record<string, unknown> | undefined)?.aiContent as Record<string, unknown> | undefined) ?? null);
      const patchedBuilderProject = mergeGeneratedDraftIntoBuilderProject(
        cleanedSiteJson,
        generatedDraft,
        (existingAiContent as unknown as import('../../lib/aiCanonicalContent').AiCanonicalSectionContent | null) ?? canonicalAiContent
      );

      const { error: updateError } = await supabase
        .from('wedding_sites')
        .update({
          ...patch,
          wedding_data: {
            ...mergedWeddingData,
            meta: {
              ...((((mergedWeddingData.meta as Record<string, unknown> | undefined) ?? {}))),
              aiDraft: generatedDraft,
              aiContent: canonicalAiContent,
              photoBuckets: ((((mergedWeddingData.meta as Record<string, unknown> | undefined) ?? {}).photoBuckets as Record<string, unknown> | undefined) ?? null),
            },
          },
          site_json: patchedBuilderProject,
        })
        .eq('id', stats.siteId);

      if (updateError) throw updateError;
      await loadStats();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh draft from brief';
      alert(message);
    } finally {
      setRefreshingBrief(false);
    }
  }

  const { user, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupDraftProgressPercent, setSetupDraftProgressPercent] = useState<number>(0);
  const [interactiveSuggestions, setInteractiveSuggestions] = useState<InteractiveSuggestion[]>([]);
  const [interactiveLoading, setInteractiveLoading] = useState(false);
  const [recentSiteActivity] = useState<BuilderRevision[]>([]);
  const [draftBrief, setDraftBrief] = useState<Array<{ id: string; label: string; value: string; questionKey: string }>>([]);
  const [refreshingBrief, setRefreshingBrief] = useState(false);
  const [nameChangeOverviewState, setNameChangeOverviewState] = useState<{ hasWorkspace: boolean; workflowStatus: 'draft' | 'ready' | 'in_progress' | 'complete' | null; hasExecutionActivity: boolean; }>({ hasWorkspace: false, workflowStatus: null, hasExecutionActivity: false });
  const [nameChangeInsights, setNameChangeInsights] = useState<NameChangeOverviewInsights>(DEFAULT_NAME_CHANGE_INSIGHTS);

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
      return;
    }

    let mounted = true;
    const loadSuggestions = async () => {
      setInteractiveLoading(true);
      const { data, error: suggestionsErr } = await supabase
        .from('interactive_suggestions')
        .select('id, suggestion_text, created_at')
        .eq('site_slug', slug)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(8);

      if (!mounted) return;
      if (!suggestionsErr) setInteractiveSuggestions((data ?? []) as InteractiveSuggestion[]);
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
          itineraryEventCount: demoEvents.length,
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
          contactableGuestCount: demoGuests.filter((g) => Boolean(g.email)).length,
          recentRsvps,
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

      const { data: ownedSite, error: siteErr } = await supabase
        .from('wedding_sites')
.select('id, site_slug, site_url, is_published, site_json, updated_at, template_id, wedding_data, onboarding_answers, couple_name_1, couple_name_2, venue_name, wedding_date, venue_date, wedding_location')
        .eq('user_id', user.id)
        .maybeSingle();

      if (siteErr) throw siteErr;

      let site = ownedSite;

      if (!site) {
        const { data: collaboratorLink, error: collaboratorErr } = await supabase
          .from('wedding_site_collaborators')
          .select('wedding_site_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (collaboratorErr) throw collaboratorErr;

        if (collaboratorLink?.wedding_site_id) {
          const { data: collaboratorSite, error: collaboratorSiteErr } = await supabase
            .from('wedding_sites')
            .select('id, site_slug, site_url, is_published, site_json, updated_at, template_id, wedding_data, onboarding_answers, couple_name_1, couple_name_2, venue_name, wedding_date, venue_date, wedding_location')
            .eq('id', collaboratorLink.wedding_site_id)
            .maybeSingle();

          if (collaboratorSiteErr) throw collaboratorSiteErr;
          site = collaboratorSite;
        }
      }

      let weddingDate: string | null = null;
      let templateName: string | null = null;

      if (site) {
        const weddingData = site.wedding_data as Record<string, unknown> | null;
        weddingDate = resolveWeddingDateFromData(weddingData, {
          wedding_date: site.wedding_date,
          venue_date: site.venue_date,
        });
        templateName = site.template_id ?? null;
        if (isWeddingProfile(site.onboarding_answers)) {
          const summary = getWeddingProfileSummary(site.onboarding_answers);
          setDraftBrief(summary);
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
        }
      }

      const { data: guests, error: guestsErr } = await supabase
        .from('guests')
        .select('id, rsvp_status, rsvp_received_at, first_name, last_name, name, email, phone')
        .eq('wedding_site_id', site?.id ?? '')
        .order('rsvp_received_at', { ascending: false });

      if (guestsErr) throw guestsErr;

      const { count: registryItemCount } = await supabase
        .from('registry_items')
        .select('id', { count: 'exact', head: true })
        .eq('wedding_site_id', site?.id ?? '');

      const { count: itineraryEventCount } = await supabase
        .from('itinerary_events')
        .select('id', { count: 'exact', head: true })
        .eq('wedding_site_id', site?.id ?? '');

      const { count: photoAlbumCount } = await supabase
        .from('photo_albums')
        .select('id', { count: 'exact', head: true })
        .eq('wedding_site_id', site?.id ?? '');

      const { count: activePhotoAlbumCount } = await supabase
        .from('photo_albums')
        .select('id', { count: 'exact', head: true })
        .eq('wedding_site_id', site?.id ?? '')
        .eq('is_active', true);

      const allGuests = guests ?? [];
      const confirmed = allGuests.filter((g) => isAttendingRsvpStatus(g.rsvp_status));
      const declined = allGuests.filter((g) => isDeclinedRsvpStatus(g.rsvp_status));
      const pending = allGuests.filter((g) => isPendingRsvpStatus(g.rsvp_status));
      const contactableGuestCount = allGuests.filter((g) => Boolean(g.email || g.phone)).length;

      const recentRsvps: RecentRsvp[] = allGuests
        .filter((g) => hasRespondedRsvpStatus(g.rsvp_status) && g.rsvp_received_at)
        .slice(0, 5)
        .map((g) => ({
          id: g.id,
          guestName: g.name || `${g.first_name ?? ''} ${g.last_name ?? ''}`.trim() || 'Guest',
          status: g.rsvp_status as RecentRsvp['status'],
          receivedAt: g.rsvp_received_at!,
        }));

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
        totalGuests: allGuests.length,
        confirmedGuests: confirmed.length,
        declinedGuests: declined.length,
        pendingGuests: pending.length,
        itineraryEventCount: itineraryEventCount ?? 0,
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
        registryItemCount: registryItemCount ?? 0,
        photoAlbumCount: photoAlbumCount ?? 0,
        activePhotoAlbumCount: activePhotoAlbumCount ?? 0,
        contactableGuestCount,
        recentRsvps,
      });
    } catch {
      setError('Could not load your overview right now.');
    } finally {
      setLoading(false);
    }
  }

  // loadStats intentionally closes over the latest dashboard state helpers here.
  useEffect(() => {
    if (!user) return;
    void loadStats();
  }, [user, isDemoMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const nameChangeCard = buildNameChangeOverviewCardModel(nameChangeOverviewState);

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
    privacyMode: stats?.privacyMode ?? 'public',
    registryItemCount: stats?.registryItemCount ?? 0,
    photoAlbumCount: stats?.photoAlbumCount ?? 0,
    activePhotoAlbumCount: stats?.activePhotoAlbumCount ?? 0,
    interactiveSuggestionCount: interactiveSuggestions.length,
  });
  const analyticsConfidenceSummary = buildAnalyticsConfidenceSummary({
    totalGuests: stats?.totalGuests ?? 0,
    confirmedGuests: stats?.confirmedGuests ?? 0,
    declinedGuests: stats?.declinedGuests ?? 0,
    pendingGuests: stats?.pendingGuests ?? 0,
    contactableGuests: stats?.contactableGuestCount ?? 0,
    privacyMode: stats?.privacyMode ?? 'public',
    registryItemCount: stats?.registryItemCount ?? 0,
    photoAlbumCount: stats?.photoAlbumCount ?? 0,
    activePhotoAlbumCount: stats?.activePhotoAlbumCount ?? 0,
    interactiveSuggestionCount: interactiveSuggestions.length,
  });
  const analyticsConfidenceCards = buildAnalyticsConfidenceCards({
    totalGuests: stats?.totalGuests ?? 0,
    confirmedGuests: stats?.confirmedGuests ?? 0,
    declinedGuests: stats?.declinedGuests ?? 0,
    pendingGuests: stats?.pendingGuests ?? 0,
    contactableGuests: stats?.contactableGuestCount ?? 0,
    privacyMode: stats?.privacyMode ?? 'public',
    registryItemCount: stats?.registryItemCount ?? 0,
    photoAlbumCount: stats?.photoAlbumCount ?? 0,
    activePhotoAlbumCount: stats?.activePhotoAlbumCount ?? 0,
    interactiveSuggestionCount: interactiveSuggestions.length,
  });
  const analyticsNextMove = buildAnalyticsNextMove({
    totalGuests: stats?.totalGuests ?? 0,
    confirmedGuests: stats?.confirmedGuests ?? 0,
    declinedGuests: stats?.declinedGuests ?? 0,
    pendingGuests: stats?.pendingGuests ?? 0,
    contactableGuests: stats?.contactableGuestCount ?? 0,
    privacyMode: stats?.privacyMode ?? 'public',
    registryItemCount: stats?.registryItemCount ?? 0,
    photoAlbumCount: stats?.photoAlbumCount ?? 0,
    activePhotoAlbumCount: stats?.activePhotoAlbumCount ?? 0,
    interactiveSuggestionCount: interactiveSuggestions.length,
  });

  const guestOpsCoach = buildGuestOpsCoach({
    totalGuests: stats?.totalGuests ?? 0,
    attendingGuests: stats?.confirmedGuests ?? 0,
    pendingResponses: stats?.pendingGuests ?? 0,
    pendingWithoutEmail: 0,
    noContact: stats ? Math.max((stats.totalGuests ?? 0) - (stats.contactableGuestCount ?? 0), 0) : 0,
    missingMealChoices: 0,
    missingPlusOneNames: 0,
  });

  const hideSuggestion = async (id: string) => {
    const { error } = await supabase.from('interactive_suggestions').update({ is_hidden: true }).eq('id', id);
    if (error) {
      toast(error.message || 'Could not hide that suggestion.', 'error');
      return;
    }
    setInteractiveSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

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
  const publishReadinessItems = buildPublishReadinessItems({
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
  }).map((item) => ({ ...item, action: () => navigate(item.route) }));
  const siteVisibility = getSiteVisibilityState({ isPublished: stats?.isPublished, privacyMode: stats?.privacyMode, hideFromSearch: stats?.hideFromSearch });
  const guestAccessNote = siteVisibility.isPrivatePreview
    ? siteVisibility.state === 'private_preview_password'
      ? 'Guests still need the site password, so every reminder, print pack, and planner handoff should carry those instructions clearly.'
      : 'Guests still need the invite-only path, so broad-share links and handoff assets should match the real access route.'
    : null;
  const archiveMode = getArchiveModeDescriptor({ weddingDate: stats?.weddingDate ?? null });
  const archivePhotoMemoryCopy = getArchivePhotoMemoryCopy();
  const publishState = getPublishStateDescriptor({
    isPublished: stats?.isPublished,
    hasUnsavedChanges: stats?.isPublished && stats?.siteUpdatedAt && stats?.lastPublishedAt
      ? getOverviewTimestamp(stats.siteUpdatedAt) > getOverviewTimestamp(stats.lastPublishedAt)
      : false,
  });
  const publishBadgeVariant = publishState.tone === 'success'
    ? 'success'
    : publishState.tone === 'warning'
      ? 'warning'
      : publishState.tone === 'danger'
        ? 'error'
        : 'secondary';
  const publishProgress = getChecklistProgress(publishReadinessItems);
  const publishBlockers = getIncompleteChecklistItems(publishReadinessItems);
  const firstPublishBlocker = getFirstIncompleteChecklistItem(publishReadinessItems);
  const controlTowerBriefing = buildControlTowerBriefing({
    totalGuests: stats?.totalGuests ?? 0,
    confirmedGuests: stats?.confirmedGuests ?? 0,
    declinedGuests: stats?.declinedGuests ?? 0,
    pendingGuests: stats?.pendingGuests ?? 0,
    contactableGuestCount: stats?.contactableGuestCount ?? 0,
    itineraryEventCount: stats?.itineraryEventCount ?? 0,
    registryItemCount: stats?.registryItemCount ?? 0,
    photoAlbumCount: stats?.photoAlbumCount ?? 0,
    activePhotoAlbumCount: stats?.activePhotoAlbumCount ?? 0,
    interactiveSuggestionCount: interactiveSuggestions.length,
    recentRsvpCount: stats?.recentRsvps?.length ?? 0,
    recentSiteActivityCount: recentSiteActivity.length,
    publishBlockerCount: publishBlockers.length,
    daysUntilWedding: stats?.daysUntilWedding ?? null,
    isPublished: stats?.isPublished ?? false,
    privacyMode: stats?.privacyMode ?? 'public',
    isArchiveLike: archiveMode.isArchiveLike,
  });
  const dayOfBrainBriefing = buildDayOfBrainBriefing({
    daysUntilWedding: stats?.daysUntilWedding ?? null,
    totalGuests: stats?.totalGuests ?? 0,
    confirmedGuests: stats?.confirmedGuests ?? 0,
    pendingGuests: stats?.pendingGuests ?? 0,
    itineraryEventCount: stats?.itineraryEventCount ?? 0,
    checkedInCount: 0,
    liveIssueCount: 0,
    watchCount: 0,
    openQnaCount: 0,
    scheduledAlertCount: 0,
    invalidSeatCount: 0,
    unassignedSeatCount: 0,
    splitHouseholdCount: 0,
    isArchiveLike: archiveMode.isArchiveLike,
  });
  const coupleFocus = buildCoupleFocusModel({
    daysUntilWedding: stats?.daysUntilWedding ?? null,
    isPublished: stats?.isPublished ?? false,
    isArchiveLike: archiveMode.isArchiveLike,
    privacyMode: stats?.privacyMode ?? 'public',
    publishBlockerCount: publishBlockers.length,
    pendingGuestCount: stats?.pendingGuests ?? 0,
    contactGapCount: stats ? Math.max((stats.totalGuests ?? 0) - (stats.contactableGuestCount ?? 0), 0) : 0,
    overdueTaskCount: 0,
    dueSoonVendorCount: 0,
    seatingUnassignedCount: 0,
    itineraryEventCount: stats?.itineraryEventCount ?? null,
  });
  const overviewThroughline = buildOverviewThroughline({
    coupleFocus,
    analyticsNextMove,
    controlTowerBriefing,
  });

  function handleControlTowerAction(action: ControlTowerAction) {
    if (action.target === 'suggestions') {
      const suggestionsCard = document.getElementById('interactive-suggestions');
      if (suggestionsCard) {
        suggestionsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }

    const routeByTarget: Record<ControlTowerAction['target'], string> = {
      'builder-launch': '/dashboard/builder-v1#launch-confidence',
      'builder-polish': '/dashboard/builder-v1#builder-concierge',
      coordinator: '/dashboard/coordinator',
      guests: '/dashboard/guests',
      itinerary: '/dashboard/itinerary#itinerary-readiness',
      messages: '/dashboard/messages',
      photos: '/dashboard/photos',
      planning: '/dashboard/planning',
      registry: '/dashboard/registry',
      settings: '/dashboard/settings?tab=site#guest-access-handoff',
      suggestions: '/dashboard/overview',
      seating: '/dashboard/seating',
      vault: '/dashboard/vault',
    };
    navigate(routeByTarget[action.target]);
  }

  function handleDayOfBrainAction(action: DayOfBrainAction) {
    handleControlTowerAction(action as ControlTowerAction);
  }

  function handleAnalyticsNextMove() {
    const routeByTarget: Record<typeof analyticsNextMove.target, string> = {
      guests: '/dashboard/guests',
      messages: '/dashboard/messages',
      registry: '/dashboard/registry',
      photos: '/dashboard/photos',
      'builder-polish': '/dashboard/builder-v1#builder-concierge',
      settings: '/dashboard/settings?tab=site#guest-access-handoff',
    };
    navigate(routeByTarget[analyticsNextMove.target]);
  }

  function handleCoupleFocusAction(step: CoupleFocusStep) {
    const routeByTarget: Record<CoupleFocusStep['target'], string> = {
      'builder-launch': '/dashboard/builder-v1#launch-confidence',
      'builder-polish': '/dashboard/builder-v1#builder-concierge',
      planning: '/dashboard/planning',
      'planning-tasks': '/dashboard/planning?tab=tasks',
      'planning-vendors': '/dashboard/planning?tab=vendors',
      itinerary: '/dashboard/itinerary#itinerary-readiness',
      guests: '/dashboard/guests',
      messages: '/dashboard/messages',
      settings: '/dashboard/settings?tab=site#guest-access-handoff',
      seating: '/dashboard/seating',
      coordinator: '/dashboard/coordinator',
      photos: '/dashboard/photos',
      vault: '/dashboard/vault',
    };
    navigate(routeByTarget[step.target]);
  }

  return (
    <DashboardLayout currentPage="overview">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="card-clean px-5 py-4 md:px-6 md:py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase updates-wide text-text-tertiary">Setup progress</p>
              <p className="text-sm text-text-secondary mt-1">Keep momentum — complete your core setup items.</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-text-primary">{setupCompletedCount}/{setupChecklist.length}</p>
              <p className="text-xs text-text-tertiary">complete</p>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-surface-subtle overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(setupCompletedCount / Math.max(setupChecklist.length, 1)) * 100}%` }}
            />
          </div>
        </div>
        {setupDraftProgressPercent > 0 && setupDraftProgressPercent < 100 && (
          <Card variant="bordered" padding="lg" className="shadow-sm border-rose-200 bg-rose-50/40">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-rose-900">Builder V2 setup in progress</p>
                <p className="text-xs text-rose-700 mt-1">You're {setupDraftProgressPercent}% done. Finish setup for stronger defaults.</p>
              </div>
              <button
                onClick={() => navigate('/setup/names')}
                className="rounded bg-rose-600 px-3 py-2 text-xs font-medium text-white hover:bg-rose-700"
              >
                Resume setup
              </button>
            </div>
          </Card>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">Overview</h1>
            <p className="text-text-secondary">Your wedding at a glance</p>
            {!loading && stats && !stats.isPublished && (
              <div className="mt-2 space-y-1.5">
                <div className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                  {SITE_VISIBILITY_COPY.draftBadge}
                </div>
                {firstPublishBlocker && (
                  <p className="text-xs text-amber-700">Next thing before guest-facing launch: {firstPublishBlocker.label}</p>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto sm:flex-wrap sm:justify-end">
            {!loading && stats?.isPublished && stats?.siteSlug && (
              <Button variant="outline" size="sm" onClick={() => window.open(`/site/${stats.siteSlug}`, '_blank')}>
                Open live website
              </Button>
            )}
            {!loading && stats && !stats.isPublished && (
              <>
                <Button
                  variant="accent"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => navigate('/dashboard/builder-v1?publishNow=1')}
                  title="Open your site editor and go straight to the go-live checklist"
                >
                  Open launch checklist
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => navigate('/dashboard/builder-v1?photoTips=1')}
                  title="Open your site editor with photo tips"
                >
                  Add photos better
                </Button>
                {publishBlockers.length > 0 && firstPublishBlocker?.action && (
                  <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => firstPublishBlocker.action?.()}>
                    Fix what’s left ({publishBlockers.length})
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {error && <DashboardStateBlock title="Couldn’t load overview right now" description={error} tone="error" />}

        {loading ? (
          <div className="space-y-6 animate-pulse" aria-hidden="true">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="h-32 rounded-2xl bg-surface-subtle border border-border-subtle" />
              <div className="h-32 rounded-2xl bg-surface-subtle border border-border-subtle" />
              <div className="h-32 rounded-2xl bg-surface-subtle border border-border-subtle" />
              <div className="h-32 rounded-2xl bg-surface-subtle border border-border-subtle" />
            </div>
            <div className="h-44 rounded-2xl bg-surface-subtle border border-border-subtle" />
          </div>
        ) : (
          <>
            <Card variant="bordered" padding="lg" className="shadow-sm border-border-subtle">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">Couple focus</p>
                  <h2 className="mt-2 text-2xl font-semibold text-text-primary">{coupleFocus.headline}</h2>
                  <p className="mt-2 text-sm text-text-secondary">{coupleFocus.summary}</p>
                </div>
                <div className="rounded-2xl border border-border-subtle bg-surface-subtle/30 px-4 py-3 lg:min-w-[220px]">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-text-tertiary">How to use this</p>
                  <p className="mt-1 text-xs text-text-secondary">This is the one order of operations that should matter most to the couple right now.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {coupleFocus.steps.map((step) => (
                  <div key={step.id} className="rounded-2xl border border-border-subtle bg-white px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-text-primary">{step.title}</p>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        step.status === 'current'
                          ? 'border border-primary/20 bg-primary-light text-primary'
                          : step.status === 'next'
                            ? 'border border-warning/20 bg-warning-light text-warning'
                            : 'border border-border-subtle bg-surface-subtle text-text-secondary'
                      }`}>
                        {getFlowStatusLabel(step.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-text-secondary">{step.detail}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => handleCoupleFocusAction(step)}
                    >
                      {step.ctaLabel}
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-border-subtle bg-surface-subtle/30 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">Watchout</p>
                <p className="mt-1 text-sm text-text-secondary">{coupleFocus.watchout}</p>
              </div>
            </Card>
            <Card variant="bordered" padding="lg" className="shadow-sm border-border-subtle">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">{overviewThroughline.eyebrow}</p>
                  <h2 className="mt-2 text-xl font-semibold text-text-primary">{overviewThroughline.title}</h2>
                  <p className="mt-2 text-sm text-text-secondary">{overviewThroughline.detail}</p>
                </div>
                <div className="rounded-2xl border border-border-subtle bg-surface-subtle/30 px-4 py-3 lg:min-w-[220px]">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-text-tertiary">Why this helps</p>
                  <p className="mt-1 text-xs text-text-secondary">It keeps the smart surfaces aligned so you do not have to mentally merge the board yourself.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {overviewThroughline.steps.map((step) => (
                  <div key={`${step.status}-${step.title}`} className="rounded-2xl border border-border-subtle bg-white px-4 py-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-text-primary">{step.title}</p>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        step.status === 'current'
                          ? 'border border-primary/20 bg-primary-light text-primary'
                          : step.status === 'next'
                            ? 'border border-warning/20 bg-warning-light text-warning'
                            : 'border border-border-subtle bg-surface-subtle text-text-secondary'
                      }`}>
                        {getFlowStatusLabel(step.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-text-secondary">{step.detail}</p>
                  </div>
                ))}
              </div>
            </Card>
            <ControlTowerBriefingCard briefing={controlTowerBriefing} onAction={handleControlTowerAction} />
            {(stats?.daysUntilWedding !== null || archiveMode.isArchiveLike) && (
              <DayOfBrainCard briefing={dayOfBrainBriefing} onAction={handleDayOfBrainAction} />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card variant="bordered" padding="md" className="h-full shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-accent-light rounded-lg">
                    <Users className="w-6 h-6 text-accent" aria-hidden="true" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary mb-1">{stats ? `${stats.confirmedGuests} / ${stats.totalGuests}` : '—'}</p>
                  <p className="text-sm text-text-secondary">RSVPs received</p>
                  {responseRate !== null && <p className="text-xs text-text-tertiary mt-2">{responseRate}% replied so far</p>}
                  {stats?.totalGuests === 0 && <p className="text-xs text-text-tertiary mt-2">Add guests to get started</p>}
                </div>
              </Card>

              <Card variant="bordered" padding="md" className="h-full shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-primary-light rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-primary" aria-hidden="true" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary mb-1">{stats ? stats.confirmedGuests : '—'}</p>
                  <p className="text-sm text-text-secondary">Confirmed guests</p>
                  {stats && stats.declinedGuests > 0 && <p className="text-xs text-text-tertiary mt-2">{stats.declinedGuests} declined</p>}
                  {stats && stats.pendingGuests > 0 && stats.declinedGuests === 0 && <p className="text-xs text-text-tertiary mt-2">{stats.pendingGuests} pending</p>}
                </div>
              </Card>

              <Card variant="bordered" padding="md" className="h-full shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-primary-light rounded-lg">
                    <Clock className="w-6 h-6 text-primary" aria-hidden="true" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary mb-1">{stats?.pendingGuests ?? '—'}</p>
                  <p className="text-sm text-text-secondary">Awaiting response</p>
                  {stats && stats.totalGuests > 0 && <p className="text-xs text-text-tertiary mt-2">of {stats.totalGuests} invited</p>}
                </div>
              </Card>

              <Card variant="bordered" padding="md" className="h-full shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-primary-light rounded-lg">
                    <Calendar className="w-6 h-6 text-primary" aria-hidden="true" />
                  </div>
                </div>
                <div>
                  {stats?.daysUntilWedding !== null && stats?.daysUntilWedding !== undefined ? (
                    <>
                      <p className="text-2xl font-bold text-text-primary mb-1">
                        {stats.daysUntilWedding > 0 ? stats.daysUntilWedding : stats.daysUntilWedding === 0 ? 'Today' : `+${Math.abs(stats.daysUntilWedding)}`}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {stats.daysUntilWedding > 0 ? 'Days until wedding' : stats.daysUntilWedding === 0 ? 'Wedding day!' : 'Days since wedding'}
                      </p>
                      {stats.weddingDate && <p className="text-xs text-text-tertiary mt-2">{formatOverviewWeddingDate(stats.weddingDate)}</p>}
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-text-primary mb-1">—</p>
                      <p className="text-sm text-text-secondary">Days until wedding</p>
                      <Link to="/dashboard/settings" className="text-xs text-primary hover:text-primary-hover mt-2 block">
                        Set your date
                      </Link>
                    </>
                  )}
                </div>
              </Card>
            </div>

            <Card variant="bordered" padding="lg" className="shadow-sm">
              <CardHeader>
                <CardTitle>Engagement dashboard</CardTitle>
                <CardDescription>One place for RSVP momentum, guest reachability, registry readiness, and photo prompt signals.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-border-subtle bg-surface-secondary/20 px-4 py-4">
                    <p className="text-xs uppercase tracking-wide text-text-tertiary">Response rate</p>
                    <p className="mt-1 text-2xl font-bold text-text-primary">{responseRate ?? 0}%</p>
                    <p className="mt-1 text-xs text-text-secondary">Guests who already replied</p>
                  </div>
                  <div className="rounded-xl border border-border-subtle bg-surface-secondary/20 px-4 py-4">
                    <p className="text-xs uppercase tracking-wide text-text-tertiary">Attendance rate</p>
                    <p className="mt-1 text-2xl font-bold text-text-primary">{attendanceRate ?? 0}%</p>
                    <p className="mt-1 text-xs text-text-secondary">Invited guests currently marked attending</p>
                  </div>
                  <div className="rounded-xl border border-border-subtle bg-surface-secondary/20 px-4 py-4">
                    <p className="text-xs uppercase tracking-wide text-text-tertiary">Contact coverage</p>
                    <p className="mt-1 text-2xl font-bold text-text-primary">{contactCoverage ?? 0}%</p>
                    <p className="mt-1 text-xs text-text-secondary">Guests with email or phone on file</p>
                  </div>
                  <div className="rounded-xl border border-border-subtle bg-surface-secondary/20 px-4 py-4">
                    <p className="text-xs uppercase tracking-wide text-text-tertiary">Registry readiness</p>
                    <p className="mt-1 text-2xl font-bold text-text-primary">{stats?.registryItemCount ?? 0}</p>
                    <p className="mt-1 text-xs text-text-secondary">Live registry items ready for guests</p>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-3">
                  <div className="rounded-xl border border-border-subtle bg-white px-4 py-4">
                    <p className="text-sm font-semibold text-text-primary">RSVP funnel</p>
                    <div className="mt-3 space-y-2 text-sm text-text-secondary">
                      <div className="flex items-center justify-between gap-3"><span>Confirmed</span><span className="font-semibold text-text-primary">{stats?.confirmedGuests ?? 0}</span></div>
                      <div className="flex items-center justify-between gap-3"><span>Declined</span><span className="font-semibold text-text-primary">{stats?.declinedGuests ?? 0}</span></div>
                      <div className="flex items-center justify-between gap-3"><span>Pending</span><span className="font-semibold text-text-primary">{stats?.pendingGuests ?? 0}</span></div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border-subtle bg-white px-4 py-4">
                    <p className="text-sm font-semibold text-text-primary">Registry + photos</p>
                    <div className="mt-3 space-y-2 text-sm text-text-secondary">
                      <div className="flex items-center justify-between gap-3"><span>Registry items</span><span className="font-semibold text-text-primary">{stats?.registryItemCount ?? 0}</span></div>
                      <div className="flex items-center justify-between gap-3"><span>Photo albums</span><span className="font-semibold text-text-primary">{stats?.activePhotoAlbumCount ?? 0}/{stats?.photoAlbumCount ?? 0}</span></div>
                      <div className="flex items-center justify-between gap-3"><span>Guest prompts</span><span className="font-semibold text-text-primary">{interactiveSuggestions.length}</span></div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border-subtle bg-white px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">Guest ops coach</p>
                        <p className="mt-1 text-xs text-text-secondary">{guestOpsCoach.summary}</p>
                      </div>
                      <Badge variant={guestOpsCoach.tone === 'urgent' ? 'error' : guestOpsCoach.tone === 'steady' ? 'warning' : 'success'}>
                        {guestOpsCoach.statusLabel}
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      {guestOpsCoach.actions.slice(0, 3).map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => navigate(action.area === 'messages' ? '/dashboard/messages' : '/dashboard/guests')}
                          className="w-full rounded-lg border border-border-subtle bg-surface-secondary/20 px-3 py-2 text-left hover:border-primary/30 hover:bg-white"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium text-text-primary">{action.title}</span>
                            <span className="text-[11px] text-primary">{action.ctaLabel}</span>
                          </div>
                          <p className="mt-1 text-xs text-text-secondary">{action.detail}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {draftBrief.length > 0 && (
              <Card variant="bordered" padding="lg" className="shadow-sm">
                <CardHeader>
                  <CardTitle>Saved onboarding brief</CardTitle>
                  <CardDescription>This is the structured concierge brief currently saved on the site.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {draftBrief.map((item) => (
                      <div key={item.id} className="rounded-xl border border-border-subtle bg-white px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-text-tertiary">{item.label}</p>
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
            <Card variant="bordered" padding="lg" className="shadow-sm lg:col-span-2">
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
                    <p className="text-sm font-medium text-text-primary">Planning stays primary</p>
                    <p className="mt-1 text-xs text-text-secondary">Before the wedding, planning, guests, RSVP, seating, and live coordination stay in the foreground.</p>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-secondary/20 px-3 py-3">
                    <p className="text-sm font-medium text-text-primary">Archive transition should be intentional</p>
                    <p className="mt-1 text-xs text-text-secondary">After the event, the product should gradually quiet the urgent ops layer instead of pretending nothing changed.</p>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-secondary/20 px-3 py-3">
                    <p className="text-sm font-medium text-text-primary">Vault becomes more important later</p>
                    <p className="mt-1 text-xs text-text-secondary">The anniversary vault and memory surfaces should start carrying more weight once the event is over.</p>
                  </div>
                </div>
                {archiveMode.isArchiveLike && (
                  <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-4 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-stone-900">Archive experience should take the lead now</p>
                      <p className="mt-1 text-sm text-stone-700">This is where DayOf should start feeling less like a control panel and more like a keepsake: fewer urgent prompts, more story, photos, and anniversary memory surfaces.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="rounded-lg border border-stone-200 bg-white px-3 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Come back next</p>
                        <p className="mt-1 text-xs text-stone-700">Add one anniversary note while the wedding is still fresh.</p>
                      </div>
                      <div className="rounded-lg border border-stone-200 bg-white px-3 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Keep alive</p>
                        <p className="mt-1 text-xs text-stone-700">Collect the best guest photos and keep the public story worth revisiting.</p>
                      </div>
                      <div className="rounded-lg border border-stone-200 bg-white px-3 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Return later</p>
                        <p className="mt-1 text-xs text-stone-700">Let anniversaries unlock memories without rebuilding the whole context each year.</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/vault')}>Open anniversary vaults</Button>
                      <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/photos')}>Open photo sharing</Button>
                      <Button variant="outline" size="sm" onClick={() => stats?.siteSlug && window.open(`/site/${stats.siteSlug}`, '_blank')}>Revisit public site</Button>
                    </div>
                  </div>
                )}

                {archiveMode.isArchiveLike && (
                  <div className="rounded-2xl border border-stone-300 bg-white px-4 py-4 space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">Private archive home</p>
                      <p className="mt-1 text-sm text-stone-700">Post-wedding, this should become the center of gravity: memories first, operations second.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-stone-500">Memory layer</p>
                        <p className="mt-1 text-sm text-stone-800">Open anniversary vaults, add one note, and keep future milestones alive.</p>
                      </div>
                      <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-stone-500">Photo memory</p>
                        <p className="mt-1 text-sm text-stone-800">{archivePhotoMemoryCopy.cardDetail}</p>
                      </div>
                      <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-stone-500">Keepsake site</p>
                        <p className="mt-1 text-sm text-stone-800">Revisit the public story without throwing planning urgency back in your face.</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="accent" size="sm" onClick={() => navigate('/dashboard/vault')}>Go to archive vaults</Button>
                      <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/photos')}>{archivePhotoMemoryCopy.actionLabel}</Button>
                      <Button variant="outline" size="sm" onClick={() => stats?.siteSlug && window.open(`/site/${stats.siteSlug}`, '_blank')}>Open keepsake site</Button>
                    </div>
                  </div>
                )}

                {archiveMode.isArchiveLike && (
                  <div className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-4 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-sky-950">Post-wedding name change assistant</p>
                        <p className="mt-1 text-xs uppercase tracking-wide text-sky-700">Free assistant · status vault · proof tracking</p>
                        <p className="mt-1 text-base font-semibold text-sky-950">{nameChangeCard.headline}</p>
                        <p className="mt-1 text-sm text-sky-900">{nameChangeCard.helperCopy}</p>
                      </div>
                      <Badge variant="secondary">{nameChangeCard.badgeLabel}</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-xl border border-sky-300 bg-sky-100/80 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-sky-700">Main focus</p>
                        <p className="mt-1 text-sm font-semibold text-sky-950">{nameChangeCard.focusTitle}</p>
                        <p className="mt-1 text-xs leading-5 text-sky-900">{nameChangeCard.focusDetail}</p>
                      </div>
                      <div className="rounded-xl border border-sky-300 bg-white px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-sky-700">Best next move</p>
                        <p className="mt-1 text-sm font-semibold text-sky-950">{nameChangeCard.bestNextMove}</p>
                        <p className="mt-3 text-xs uppercase tracking-wide text-sky-700">Decision rule</p>
                        <p className="mt-1 text-xs leading-5 text-sky-900">{nameChangeCard.decisionRule}</p>
                        <p className="mt-3 text-xs uppercase tracking-wide text-sky-700">Watchout</p>
                        <p className="mt-1 text-xs leading-5 text-sky-900">{nameChangeCard.watchout}</p>
                      </div>
                      <div className="rounded-xl border border-sky-300 bg-sky-100/80 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-sky-700">Current / next / then</p>
                        <div className="mt-2 space-y-2">
                          {nameChangeCard.sequence.map((step) => (
                            <div key={step.status} className="rounded-lg border border-sky-200 bg-white/80 px-3 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                                  {step.status === 'current' ? 'Current' : step.status === 'next' ? 'Next' : 'Then'}
                                </p>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  step.status === 'current'
                                    ? 'border border-sky-300 bg-sky-100 text-sky-700'
                                    : step.status === 'next'
                                      ? 'border border-amber-200 bg-amber-50 text-amber-700'
                                      : 'border border-sky-200 bg-white text-sky-700'
                                }`}>
                                  {step.status === 'current' ? 'Current' : step.status === 'next' ? 'Next' : 'Then'}
                                </span>
                              </div>
                              <p className="mt-1 text-sm font-semibold text-sky-950">{step.title}</p>
                              <p className="mt-1 text-xs leading-5 text-sky-900">{step.detail}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl border border-sky-300 bg-sky-100/80 px-4 py-3 md:col-span-3">
                        <p className="text-xs uppercase tracking-wide text-sky-700">Optional next step</p>
                        <p className="mt-1 text-sm font-semibold text-sky-950">{nameChangeCard.optionalNextStep}</p>
                        <p className="mt-1 text-xs text-sky-900">{nameChangeCard.statusLabel}</p>
                        {nameChangeInsights.concreteResumeLabel ? (
                          <p className="mt-1 text-xs text-sky-900">
                            If you want a concrete place to pick back up,{' '}
                            <button
                              type="button"
                              className="font-medium text-sky-950 underline underline-offset-2"
                              onClick={() => navigate(nameChangeCard.plannerHref)}
                            >
                              {nameChangeInsights.concreteResumeLabel}
                            </button>
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-sky-900">
                          <button
                            type="button"
                            className="rounded-full border border-sky-300 bg-white px-2 py-1 font-medium"
                            onClick={() => navigate(nameChangeInsights.milestoneSummaryHref)}
                          >
                            {nameChangeInsights.milestoneSummaryLabel}
                          </button>
                          <button
                            type="button"
                            className="rounded-full border border-sky-300 bg-white px-2 py-1 font-medium"
                            onClick={() => navigate(nameChangeInsights.reminderSummaryHref)}
                          >
                            {nameChangeInsights.reminderSummaryLabel}
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="rounded-xl border border-sky-200 bg-white px-4 py-3 text-left"
                        onClick={() => navigate(nameChangeCard.plannerHref)}
                      >
                        <p className="text-xs uppercase tracking-wide text-sky-700">{NAME_CHANGE_LIFECYCLE_LABELS.coreChain}</p>
                        <p className="mt-1 text-sm text-sky-950">{nameChangeInsights.coreChainLabel}</p>
                      </button>
                      <button
                        type="button"
                        className="rounded-xl border border-sky-200 bg-white px-4 py-3 text-left"
                        onClick={() => navigate(nameChangeCard.plannerHref)}
                      >
                        <p className="text-xs uppercase tracking-wide text-sky-700">{NAME_CHANGE_LIFECYCLE_LABELS.followOn}</p>
                        <p className="mt-1 text-sm text-sky-950">{nameChangeInsights.followOnLabel}</p>
                      </button>
                      <button
                        type="button"
                        className="rounded-xl border border-sky-200 bg-white px-4 py-3 text-left"
                        onClick={() => navigate(nameChangeInsights.downstreamHref)}
                      >
                        <p className="text-xs uppercase tracking-wide text-sky-700">{NAME_CHANGE_LIFECYCLE_LABELS.downstream}</p>
                        <p className="mt-1 text-sm text-sky-950">{nameChangeInsights.downstreamLabel}</p>
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


            <Card variant="bordered" padding="lg" className="shadow-sm lg:col-span-2">
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
                    <p className="mt-1 text-xs text-text-secondary">Story, event details, FAQs, and registry links now have migration-focused recovery helpers instead of raw carryover only.</p>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-secondary/20 px-3 py-3">
                    <p className="text-sm font-medium text-text-primary">Publish is still review-based</p>
                    <p className="mt-1 text-xs text-text-secondary">The product now tells you what to verify before publishing so migration does not feel like guess-and-hope.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="bordered" padding="lg" className="shadow-sm lg:col-span-2">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>Planner command center</CardTitle>
                    <CardDescription>DayOf is not just your website. It is the shared operating layer for the couple, the planner they invite, guests, RSVPs, seating, messages, and event-day coordination.</CardDescription>
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
                    <p className="text-sm font-medium text-text-primary">RSVP + guest ops</p>
                    <p className="mt-1 text-xs text-text-secondary">Move from invite status into live follow-up and arrival decisions without switching tools.</p>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-secondary/20 px-3 py-3">
                    <p className="text-sm font-medium text-text-primary">Seating + live access</p>
                    <p className="mt-1 text-xs text-text-secondary">Keep table assignments and guest lookup ready for the people actually running the event.</p>
                  </div>
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-secondary/20 px-3 py-2.5 text-xs text-text-secondary">
                  Proof so far: planner access starts in Settings, planner workspace modes now exist across operations screens, and role boundaries are tighter than a generic shared login.
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="accent" size="md" onClick={() => navigate('/dashboard/coordinator')}>
                    <Radio className="w-4 h-4 mr-2" aria-hidden="true" />
                    Open planner command view
                  </Button>
                  <Button variant="outline" size="md" onClick={() => navigate('/dashboard/planning')}>
                    <Radio className="w-4 h-4 mr-2" aria-hidden="true" />
                    Open planning workspace
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

              <Card variant="bordered" padding="lg" className="shadow-sm">
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
                  {guestAccessNote && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm">
                      <p className="font-medium text-amber-900">Guest access needs one shared instruction set</p>
                      <p className="mt-1 text-amber-800">{guestAccessNote}</p>
                      <button
                        type="button"
                        onClick={() => navigate('/dashboard/settings?tab=site#guest-access-handoff')}
                        className="mt-2 text-xs font-medium text-amber-900 underline underline-offset-2"
                      >
                        Review site access settings
                      </button>
                    </div>
                  )}
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
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                          Going live makes this site visible to guests at your guest-facing DayOf URL. Until then, it should stay in draft or intentional private-preview mode only.
                        </div>
                      )}

                      {firstPublishBlocker?.action && (
                        <button
                          type="button"
                          onClick={() => firstPublishBlocker.action?.()}
                          className="w-full rounded border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
                        >
                          Fix next: {firstPublishBlocker.label}
                        </button>
                      )}
                    </div>
                  </details>
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    {stats?.siteSlug && (
                      <Button variant="accent" size="md" fullWidth onClick={() => window.open(`/site/${stats.siteSlug}`, '_blank')}>
                        <ExternalLink className="w-5 h-5 mr-2" aria-hidden="true" />
                        {stats.isPublished ? 'Open live website' : 'Preview draft website'}
                      </Button>
                    )}
                    <Button variant="outline" size="md" fullWidth onClick={() => navigate('/dashboard/builder-v1?photoTips=1')}>
                      <Edit className="w-5 h-5 mr-2" aria-hidden="true" />
                      {stats?.isPublished ? 'Edit live website' : 'Edit draft before you go live'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card variant="bordered" padding="lg" className="shadow-sm">
                <CardHeader>
                  <CardTitle>Recent RSVPs</CardTitle>
                  <CardDescription>Latest responses from your guests</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats?.recentRsvps && stats.recentRsvps.length > 0 ? (
                    <div className="space-y-4">
                      {stats.recentRsvps.map((rsvp) => (
                        <div key={rsvp.id} className="flex gap-4">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${isAttendingRsvpStatus(rsvp.status) ? 'bg-success' : 'bg-error'}`} />
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



            <Card variant="bordered" padding="lg" className="shadow-sm">
              <CardHeader>
                <CardTitle>Proof baseline</CardTitle>
                <CardDescription>Only measured product signals shown here. No guessed conversion metrics.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border border-border-subtle bg-surface-secondary/30 px-3 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{analyticsConfidenceSummary.title}</p>
                      <p className="mt-1 text-xs text-text-secondary">{analyticsConfidenceSummary.detail}</p>
                    </div>
                    <Badge variant={analyticsConfidenceSummary.tone}>{analyticsConfidenceSummary.statusLabel}</Badge>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-border-subtle bg-white px-3 py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Best next move</p>
                      <p className="mt-1 text-[11px] leading-5 text-text-tertiary">{analyticsConfidenceSummary.bestNextMove}</p>
                      <div className="mt-3 border-t border-border-subtle pt-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Decision rule</p>
                        <p className="mt-1 text-[11px] leading-5 text-text-tertiary">{analyticsConfidenceSummary.decisionRule}</p>
                        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Watchout</p>
                        <p className="mt-1 text-[11px] leading-5 text-text-tertiary">{analyticsConfidenceSummary.watchout}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {analyticsConfidenceSummary.sequence.map((step) => (
                      <div key={step.id} className="rounded-lg border border-border-subtle bg-white px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold text-text-primary">{step.title}</p>
                          <span className="rounded-full border border-border-subtle bg-surface-secondary/20 px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                            {getFlowStatusLabel(step.status)}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] leading-5 text-text-tertiary">{step.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  {analyticsConfidenceCards.map((card) => (
                    <div key={card.label} className="rounded-lg border border-border-subtle bg-surface-secondary/20 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-text-primary">{card.label}</p>
                        <Badge variant={card.tone}>{card.value}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-text-secondary">{card.detail}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-border-subtle bg-surface-secondary/20 px-3 py-2.5 text-xs text-text-secondary">
                  This is still the measured baseline before fuller analytics lands: response counts, registry readiness, photo setup, and guest prompts. The difference now is that the board also tells you how much confidence to place in those signals.
                </div>
                <div className="rounded-lg border border-border-subtle bg-white px-3 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{analyticsNextMove.priorityLabel}</p>
                      <p className="text-sm font-medium text-text-primary">{analyticsNextMove.title}</p>
                      <p className="mt-1 text-xs text-text-secondary">{analyticsNextMove.detail}</p>
                      <div className="mt-3 rounded-lg border border-border-subtle bg-surface-secondary/20 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Why now</p>
                        <p className="mt-1 text-[11px] leading-5 text-text-tertiary">{analyticsNextMove.whyNow}</p>
                        <div className="mt-3 border-t border-border-subtle pt-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Decision rule</p>
                          <p className="mt-1 text-[11px] leading-5 text-text-tertiary">{analyticsNextMove.decisionRule}</p>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleAnalyticsNextMove}>
                      {analyticsNextMove.ctaLabel}
                    </Button>
                  </div>
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


              <Card variant="bordered" padding="lg" className="shadow-sm">
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
                    This is a lightweight audit trail for support and confidence. Durable cross-device logging is still next.
                  </div>
                </CardContent>
              </Card>

              <Card id="interactive-suggestions" variant="bordered" padding="lg" className="shadow-sm">
                <CardHeader>
                  <CardTitle>Interactive suggestions</CardTitle>
                  <CardDescription>Latest guest prompt responses (moderation)</CardDescription>
                </CardHeader>
                <CardContent>
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
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};
