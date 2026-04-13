import React, { useEffect, useState } from 'react';
import { readSetupDraft, setupDraftProgress } from '../../lib/setupDraft';
import { SITE_VISIBILITY_COPY } from '../../lib/siteVisibilityCopy';
import {
  buildPublishReadinessItems,
  buildSetupChecklist,
  getChecklistProgress,
  getFirstIncompleteChecklistItem,
  getIncompleteChecklistItems,
} from './overviewUtils';
import { buildAnalyticsBaseline } from './analyticsBaseline';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { DashboardStateBlock } from '../../components/dashboard/DashboardStateBlock';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '../../components/ui';
import { Eye, Users, CheckCircle2, Calendar, ExternalLink, Edit, Clock, EyeOff, Radio } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { demoWeddingSite, demoGuests } from '../../lib/demoData';
import { resolvePublicSiteSlugFromRow } from '../../lib/publicSiteSlug';
import { getSiteVisibilityState } from '../../lib/siteVisibilityState';
import { getPublishStateDescriptor } from '../../lib/publishState';
import { listBuilderRevisions, type BuilderRevision } from '../../builder/services/versionHistory';
import { getArchiveModeDescriptor } from '../../lib/archiveMode';

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
  contactableGuestCount: number;
  recentRsvps: RecentRsvp[];
}

interface RecentRsvp {
  id: string;
  guestName: string;
  status: 'confirmed' | 'declined';
  receivedAt: string;
}

interface InteractiveSuggestion {
  id: string;
  suggestion_text: string;
  created_at: string;
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatWeddingDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function calcDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
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
  const { user, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupDraftProgressPercent, setSetupDraftProgressPercent] = useState<number>(0);
  const [interactiveSuggestions, setInteractiveSuggestions] = useState<InteractiveSuggestion[]>([]);
  const [interactiveLoading, setInteractiveLoading] = useState(false);
  const [recentSiteActivity, setRecentSiteActivity] = useState<BuilderRevision[]>([]);

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
        const confirmed = demoGuests.filter((g) => g.rsvp_status === 'confirmed');
        const declined = demoGuests.filter((g) => g.rsvp_status === 'declined');
        const pending = demoGuests.filter((g) => g.rsvp_status === 'pending');

        const recentRsvps: RecentRsvp[] = [...confirmed, ...declined]
          .slice(0, 5)
          .map((g, i) => ({
            id: g.id,
            guestName: g.name || `${g.first_name ?? ''} ${g.last_name ?? ''}`.trim() || 'Guest',
            status: g.rsvp_status as 'confirmed' | 'declined',
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
          daysUntilWedding: weddingDate ? calcDaysUntil(weddingDate) : null,
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
          contactableGuestCount: demoGuests.filter((g) => Boolean(g.email || g.phone)).length,
          recentRsvps,
        });
        return;
      }

      const { data: site, error: siteErr } = await supabase
        .from('wedding_sites')
.select('id, site_slug, site_url, is_published, privacy_mode, site_json, updated_at, template_id, wedding_data, couple_name_1, couple_name_2, venue_name, wedding_date, venue_date, wedding_location')
        .eq('user_id', user.id)
        .maybeSingle();

      if (siteErr) throw siteErr;

      let weddingDate: string | null = null;
      let templateName: string | null = null;

      if (site) {
        const weddingData = site.wedding_data as Record<string, unknown> | null;
        weddingDate = resolveWeddingDateFromData(weddingData, {
          wedding_date: site.wedding_date,
          venue_date: site.venue_date,
        });
        templateName = site.template_id ?? null;
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
      const confirmed = allGuests.filter((g) => g.rsvp_status === 'confirmed');
      const declined = allGuests.filter((g) => g.rsvp_status === 'declined');
      const pending = allGuests.filter((g) => g.rsvp_status === 'pending');
      const contactableGuestCount = allGuests.filter((g) => Boolean(g.email || g.phone)).length;

      const recentRsvps: RecentRsvp[] = allGuests
        .filter((g) => g.rsvp_status !== 'pending' && g.rsvp_received_at)
        .slice(0, 5)
        .map((g) => ({
          id: g.id,
          guestName: g.name || `${g.first_name ?? ''} ${g.last_name ?? ''}`.trim() || 'Guest',
          status: g.rsvp_status as 'confirmed' | 'declined',
          receivedAt: g.rsvp_received_at!,
        }));

      const siteJson = (site?.site_json as Record<string, unknown> | null) ?? null;
      const privacyMode = site?.privacy_mode === 'password_protected' || site?.privacy_mode === 'invite_only' ? site.privacy_mode : 'public';
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
        daysUntilWedding: weddingDate ? calcDaysUntil(weddingDate) : null,
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

  const hideSuggestion = async (id: string) => {
    await supabase.from('interactive_suggestions').update({ is_hidden: true }).eq('id', id);
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
  const archiveMode = getArchiveModeDescriptor({ weddingDate: stats?.weddingDate ?? null });
  const publishState = getPublishStateDescriptor({
    isPublished: stats?.isPublished,
    hasUnsavedChanges: stats?.isPublished && stats?.siteUpdatedAt && stats?.lastPublishedAt
      ? new Date(stats.siteUpdatedAt).getTime() > new Date(stats.lastPublishedAt).getTime()
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
                  onClick={() => navigate('/dashboard/builder?publishNow=1')}
                  title="Open your site editor and go straight to the go-live checklist"
                >
                  Open launch checklist
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => navigate('/dashboard/builder?photoTips=1')}
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
                      {stats.weddingDate && <p className="text-xs text-text-tertiary mt-2">{formatWeddingDate(stats.weddingDate)}</p>}
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
                    <p className="text-sm font-semibold text-text-primary">Where to push next</p>
                    <div className="mt-3 space-y-2 text-sm text-text-secondary">
                      <p>{(stats?.pendingGuests ?? 0) > 0 ? `${stats?.pendingGuests ?? 0} guests still need an RSVP reply.` : 'RSVP backlog is clear right now.'}</p>
                      <p>{(stats?.contactableGuestCount ?? 0) < (stats?.totalGuests ?? 0) ? `${(stats?.totalGuests ?? 0) - (stats?.contactableGuestCount ?? 0)} guests still need contact coverage.` : 'Guest contact coverage looks complete.'}</p>
                      <p>{(stats?.registryItemCount ?? 0) === 0 ? 'Registry still needs live items.' : 'Registry has enough live items to be guest-facing.'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                        <p className="mt-1 text-sm text-stone-800">Review guest uploads and turn the best moments into a slideshow keepsake.</p>
                      </div>
                      <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-stone-500">Keepsake site</p>
                        <p className="mt-1 text-sm text-stone-800">Revisit the public story without throwing planning urgency back in your face.</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="accent" size="sm" onClick={() => navigate('/dashboard/vault')}>Go to archive vaults</Button>
                      <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/photos')}>Open photo memories</Button>
                      <Button variant="outline" size="sm" onClick={() => stats?.siteSlug && window.open(`/site/${stats.siteSlug}`, '_blank')}>Open keepsake site</Button>
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
                  <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                    <span className="text-text-secondary">Last live update</span>
                    <span className="text-text-primary">{stats?.lastPublishedAt ? formatRelativeTime(stats.lastPublishedAt) : '—'}</span>
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
                        <span className="text-text-primary text-sm">{stats?.siteUpdatedAt ? formatRelativeTime(stats.siteUpdatedAt) : '—'}</span>
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
                    <Button variant="outline" size="md" fullWidth onClick={() => navigate('/dashboard/builder?photoTips=1')}>
                      <Edit className="w-5 h-5 mr-2" aria-hidden="true" />
                      {stats?.isPublished ? 'Edit live website' : 'Edit draft and go live'}
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
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${rsvp.status === 'confirmed' ? 'bg-success' : 'bg-error'}`} />
                          <div className="flex-1">
                            <p className="text-sm text-text-primary font-medium">{rsvp.guestName}</p>
                            <p className="text-xs text-text-secondary">{rsvp.status === 'confirmed' ? 'Confirmed attendance' : 'Declined'}</p>
                            <p className="text-xs text-text-tertiary mt-1">{formatRelativeTime(rsvp.receivedAt)}</p>
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
                              <p className="mt-0.5 text-[11px] text-text-tertiary">{formatRelativeTime(activity.createdAtISO)} • {activity.actor}</p>
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

              <Card variant="bordered" padding="lg" className="shadow-sm">
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
                          <p className="mt-1 text-[11px] text-text-tertiary">{formatRelativeTime(item.created_at)}</p>
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
