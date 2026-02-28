import React, { useEffect, useState } from 'react';
import { readSetupDraft, setupDraftProgress } from '../../lib/setupDraft';
import {
  buildPublishReadinessItems,
  buildSetupChecklist,
  getChecklistProgress,
  getFirstIncompleteChecklistItem,
  getIncompleteChecklistItems,
} from './overviewUtils';
import { buildFunnelSnapshot } from './analyticsAggregate';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '../../components/ui';
import { Eye, Users, CheckCircle2, Calendar, ExternalLink, Edit, Loader2, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { demoWeddingSite, demoGuests } from '../../lib/demoData';

interface OverviewStats {
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
  siteUpdatedAt: string | null;
  templateName: string | null;
  coupleName1: string | null;
  coupleName2: string | null;
  venueName: string | null;
  venueLocation: string | null;
  registryItemCount: number;
  photoAlbumCount: number;
  activePhotoAlbumCount: number;
  recentRsvps: RecentRsvp[];
}

interface RecentRsvp {
  id: string;
  guestName: string;
  status: 'confirmed' | 'declined';
  receivedAt: string;
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

  async function loadStats() {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      if (isDemoMode) {
        const confirmed = demoGuests.filter(g => g.rsvp_status === 'confirmed');
        const declined = demoGuests.filter(g => g.rsvp_status === 'declined');
        const pending = demoGuests.filter(g => g.rsvp_status === 'pending');

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
          publishedVersion: 1,
          lastPublishedAt: new Date().toISOString(),
          totalGuests: demoGuests.length,
          confirmedGuests: confirmed.length,
          declinedGuests: declined.length,
          pendingGuests: pending.length,
          daysUntilWedding: weddingDate ? calcDaysUntil(weddingDate) : null,
          weddingDate,
          siteSlug: demoWeddingSite.site_url,
          isPublished: true,
          siteUpdatedAt: new Date().toISOString(),
          templateName: 'classic',
          coupleName1: demoWeddingSite.couple_name_1,
          coupleName2: demoWeddingSite.couple_name_2,
          venueName: demoWeddingSite.venue_name,
          venueLocation: demoWeddingSite.venue_location,
          registryItemCount: 2,
          photoAlbumCount: 3,
          activePhotoAlbumCount: 2,
          recentRsvps,
        });
        return;
      }

      const { data: site, error: siteErr } = await supabase
        .from('wedding_sites')
        .select('id, site_slug, is_published, site_json, updated_at, template_id, wedding_data, couple_name_1, couple_name_2, venue_name, wedding_date, venue_date, wedding_location')
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
        .select('id, rsvp_status, rsvp_received_at, first_name, last_name, name')
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
      const isPublished = Boolean(
        site?.is_published === true ||
        siteJson?.publishStatus === 'published' ||
        (typeof siteJson?.publishedVersion === 'number' && (siteJson.publishedVersion as number) > 0)
      );

      setStats({
        publishedVersion: typeof siteJson?.publishedVersion === 'number' ? (siteJson.publishedVersion as number) : null,
        lastPublishedAt: typeof siteJson?.lastPublishedAt === 'string' ? (siteJson.lastPublishedAt as string) : null,
        totalGuests: allGuests.length,
        confirmedGuests: confirmed.length,
        declinedGuests: declined.length,
        pendingGuests: pending.length,
        daysUntilWedding: weddingDate ? calcDaysUntil(weddingDate) : null,
        weddingDate,
        siteSlug: site?.site_slug ?? null,
        isPublished,
        siteUpdatedAt: site?.updated_at ?? null,
        templateName,
        coupleName1: site?.couple_name_1 ?? null,
        coupleName2: site?.couple_name_2 ?? null,
        venueName: site?.venue_name ?? null,
        venueLocation: site?.wedding_location ?? null,
        registryItemCount: registryItemCount ?? 0,
        photoAlbumCount: photoAlbumCount ?? 0,
        activePhotoAlbumCount: activePhotoAlbumCount ?? 0,
        recentRsvps,
      });
    } catch {
      setError('Could not load overview data.');
    } finally {
      setLoading(false);
    }
  }

  const responseRate =
    stats && stats.totalGuests > 0
      ? Math.round(((stats.confirmedGuests + stats.declinedGuests) / stats.totalGuests) * 100)
      : null;

  const analyticsSnapshot = buildFunnelSnapshot({
    pageViews: Math.max((stats?.totalGuests ?? 0) * 3, 1),
    heroCtaClicks: Math.max((stats?.confirmedGuests ?? 0) + Math.floor((stats?.pendingGuests ?? 0) / 2), 0),
    rsvpStarts: Math.max((stats?.confirmedGuests ?? 0) + (stats?.declinedGuests ?? 0) + Math.floor((stats?.pendingGuests ?? 0) / 2), 0),
    rsvpSuccesses: Math.max((stats?.confirmedGuests ?? 0) + (stats?.declinedGuests ?? 0), 0),
    rsvpFailures: Math.max(Math.floor((stats?.pendingGuests ?? 0) / 3), 0),
    registryClicks: Math.max((stats?.registryItemCount ?? 0) * 4, 0),
    faqExpands: Math.max((stats?.totalGuests ?? 0) * 2, 0),
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
  const nextSetupItem = setupChecklist.find((item) => !item.done) ?? null;
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
  const publishProgress = getChecklistProgress(publishReadinessItems);
  const publishBlockers = getIncompleteChecklistItems(publishReadinessItems);
  const firstPublishBlocker = getFirstIncompleteChecklistItem(publishReadinessItems);

  return (
    <DashboardLayout currentPage="overview">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="card-clean px-5 py-4 md:px-6 md:py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Setup progress</p>
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

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">Overview</h1>
            <p className="text-text-secondary">Your wedding at a glance</p>
            {!loading && stats && !stats.isPublished && (
              <div className="mt-2 space-y-1.5">
                <div className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                  Publish needed
                </div>
                {firstPublishBlocker && (
                  <p className="text-xs text-amber-700">Next blocker: {firstPublishBlocker.label}</p>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {!loading && stats?.isPublished && stats?.siteSlug && (
              <Button variant="outline" size="sm" onClick={() => window.open(`/site/${stats.siteSlug}`, '_blank')}>
                Open live site
              </Button>
            )}
            {!loading && stats && !stats.isPublished && (
              <>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => navigate('/dashboard/builder?publishNow=1')}
                  title="Open builder and run publish flow"
                >
                  Publish now
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/dashboard/builder?photoTips=1')}
                  title="Open builder with photo placement tips"
                >
                  Photo tips
                </Button>
                {publishBlockers.length > 0 && firstPublishBlocker?.action && (
                  <Button variant="outline" size="sm" onClick={() => firstPublishBlocker.action?.()}>
                    Fix blockers ({publishBlockers.length})
                  </Button>
                )}
              </>
            )}
            {nextSetupItem && !loading && (
              <Button variant="outline" size="sm" onClick={nextSetupItem.action}>
                Next step: {nextSetupItem.label}
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

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
                  <p className="text-2xl font-bold text-text-primary mb-1">
                    {stats ? `${stats.confirmedGuests} / ${stats.totalGuests}` : '—'}
                  </p>
                  <p className="text-sm text-text-secondary">RSVPs received</p>
                  {responseRate !== null && (
                    <p className="text-xs text-text-tertiary mt-2">{responseRate}% response rate</p>
                  )}
                  {stats?.totalGuests === 0 && (
                    <p className="text-xs text-text-tertiary mt-2">Add guests to get started</p>
                  )}
                </div>
              </Card>

              <Card variant="bordered" padding="md" className="h-full shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-primary-light rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-primary" aria-hidden="true" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary mb-1">
                    {stats ? stats.confirmedGuests : '—'}
                  </p>
                  <p className="text-sm text-text-secondary">Confirmed guests</p>
                  {stats && stats.declinedGuests > 0 && (
                    <p className="text-xs text-text-tertiary mt-2">{stats.declinedGuests} declined</p>
                  )}
                  {stats && stats.pendingGuests > 0 && stats.declinedGuests === 0 && (
                    <p className="text-xs text-text-tertiary mt-2">{stats.pendingGuests} pending</p>
                  )}
                </div>
              </Card>

              <Card variant="bordered" padding="md" className="h-full shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-primary-light rounded-lg">
                    <Clock className="w-6 h-6 text-primary" aria-hidden="true" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary mb-1">
                    {stats?.pendingGuests ?? '—'}
                  </p>
                  <p className="text-sm text-text-secondary">Awaiting response</p>
                  {stats && stats.totalGuests > 0 && (
                    <p className="text-xs text-text-tertiary mt-2">
                      of {stats.totalGuests} invited
                    </p>
                  )}
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
                        {stats.daysUntilWedding > 0
                          ? stats.daysUntilWedding
                          : stats.daysUntilWedding === 0
                          ? 'Today'
                          : `+${Math.abs(stats.daysUntilWedding)}`}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {stats.daysUntilWedding > 0
                          ? 'Days until wedding'
                          : stats.daysUntilWedding === 0
                          ? 'Wedding day!'
                          : 'Days since wedding'}
                      </p>
                      {stats.weddingDate && (
                        <p className="text-xs text-text-tertiary mt-2">
                          {formatWeddingDate(stats.weddingDate)}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-text-primary mb-1">—</p>
                      <p className="text-sm text-text-secondary">Days until wedding</p>
                      <Link
                        to="/dashboard/settings"
                        className="text-xs text-primary hover:text-primary-hover mt-2 block"
                      >
                        Set your date
                      </Link>
                    </>
                  )}
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card variant="bordered" padding="lg" className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Your wedding site</CardTitle>
                      <CardDescription>
                        {stats?.isPublished ? 'Published and live' : 'Not yet published'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={stats?.isPublished ? 'success' : 'secondary'}>
                        {stats?.isPublished ? 'Live' : 'Draft'}
                      </Badge>
                      {typeof stats?.publishedVersion === 'number' && (
                        <Badge variant="secondary">v{stats.publishedVersion}</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats?.siteSlug ? (
                    <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                      <span className="text-text-secondary">Site URL</span>
                      <a
                        href={`/site/${stats.siteSlug}`}
                        className="text-primary hover:text-primary-hover flex items-center gap-2 text-sm font-medium"
                      >
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
                    <span className="text-text-secondary">Template</span>
                    <span className="text-text-primary font-medium capitalize">
                      {stats?.templateName?.replace(/-/g, ' ') ?? 'Default'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                    <span className="text-text-secondary">Published version</span>
                    <span className="text-text-primary font-medium">
                      {typeof stats?.publishedVersion === 'number' ? `v${stats.publishedVersion}` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-text-secondary">Last updated</span>
                    <span className="text-text-primary">
                      {stats?.siteUpdatedAt ? formatRelativeTime(stats.siteUpdatedAt) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-text-secondary">Publishing status</span>
                    <span className="text-text-primary">
                      {stats?.isPublished ? 'Published' : 'Draft only'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-text-secondary">Last published</span>
                    <span className="text-text-primary">
                      {stats?.lastPublishedAt ? formatRelativeTime(stats.lastPublishedAt) : '—'}
                    </span>
                  </div>
                  {!stats?.isPublished && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 space-y-1.5">
                      <p className="font-medium">Your site is still private. Guests can only view it after first publish.</p>
                      <p>
                        Readiness: {stats?.siteSlug ? 'URL set' : 'set URL'} · {stats?.templateName ? 'template set' : 'choose template'} · publish once to go live.
                      </p>
                    </div>
                  )}
                  <div className="rounded-lg border border-border-subtle bg-surface-secondary/30 px-3 py-2.5 shadow-sm">
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <p className="text-xs font-medium text-text-secondary">Publishing checklist</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-text-tertiary">{publishProgress.done}/{publishProgress.total} ready</span>
                        {publishBlockers.length === 0 ? (
                          <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                            All checks passed
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => navigate('/dashboard/builder?photoTips=1')}
                          className="rounded border border-sky-300 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-800 hover:bg-sky-100"
                        >
                          Photo tips
                        </button>
                        {firstPublishBlocker?.action && (
                          <button
                            type="button"
                            onClick={() => firstPublishBlocker.action?.()}
                            className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 hover:bg-amber-100"
                          >
                            Fix next
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {publishReadinessItems.map((item) => (
                        <div key={item.id} className="text-xs text-text-secondary flex items-center justify-between gap-2 rounded border border-border-subtle bg-white px-2 py-1.5 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {item.done ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" aria-hidden="true" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                            )}
                            <span className="truncate">{item.label}</span>
                            {item.done && <span className="text-[10px] rounded border border-green-200 bg-green-50 px-1.5 py-0.5 font-medium text-green-700">Done</span>}
                          </div>
                          {!item.done && (
                            <button
                              type="button"
                              onClick={item.action}
                              className="shrink-0 rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 hover:bg-amber-100"
                            >
                              {item.actionLabel}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    {stats?.siteSlug && (
                      <Button
                        variant="accent"
                        size="md"
                        fullWidth
                        onClick={() => window.open(`/site/${stats.siteSlug}`, '_blank')}
                      >
                        <ExternalLink className="w-5 h-5 mr-2" aria-hidden="true" />
                        {stats.isPublished ? 'Open Live Site' : 'Preview Site'}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="md"
                      fullWidth
                      onClick={() => navigate('/dashboard/builder?photoTips=1')}
                    >
                      <Edit className="w-5 h-5 mr-2" aria-hidden="true" />
                      {stats?.isPublished ? 'Update Site' : 'Edit & Publish'}
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
                          <div
                            className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                              rsvp.status === 'confirmed' ? 'bg-success' : 'bg-error'
                            }`}
                          />
                          <div className="flex-1">
                            <p className="text-sm text-text-primary font-medium">
                              {rsvp.guestName}
                            </p>
                            <p className="text-xs text-text-secondary">
                              {rsvp.status === 'confirmed' ? 'Confirmed attendance' : 'Declined'}
                            </p>
                            <p className="text-xs text-text-tertiary mt-1">
                              {formatRelativeTime(rsvp.receivedAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Eye className="w-10 h-10 text-text-tertiary mb-3" />
                      <p className="text-sm text-text-secondary mb-1">No RSVPs yet</p>
                      <p className="text-xs text-text-tertiary mb-3">
                        RSVPs will appear here as guests respond
                      </p>
                      <Link to="/dashboard/guests" className="text-xs text-primary hover:text-primary-hover font-medium transition-colors">
                        Invite guests &rarr;
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card variant="bordered" padding="lg" className="shadow-sm">
              <CardHeader>
                <CardTitle>Funnel snapshot</CardTitle>
                <CardDescription>At-a-glance conversion health across core guest actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border-subtle bg-surface-secondary/40 px-3 py-2">
                    <p className="text-[11px] text-text-tertiary uppercase tracking-wide">Hero CTR</p>
                    <p className="text-xl font-semibold text-text-primary">{analyticsSnapshot.heroCtr}%</p>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-secondary/40 px-3 py-2">
                    <p className="text-[11px] text-text-tertiary uppercase tracking-wide">RSVP Start</p>
                    <p className="text-xl font-semibold text-text-primary">{analyticsSnapshot.rsvpStartRate}%</p>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-secondary/40 px-3 py-2">
                    <p className="text-[11px] text-text-tertiary uppercase tracking-wide">RSVP Complete</p>
                    <p className="text-xl font-semibold text-text-primary">{analyticsSnapshot.rsvpCompletionRate}%</p>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-secondary/40 px-3 py-2">
                    <p className="text-[11px] text-text-tertiary uppercase tracking-wide">RSVP Fail</p>
                    <p className="text-xl font-semibold text-text-primary">{analyticsSnapshot.rsvpFailureRate}%</p>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-secondary/40 px-3 py-2">
                    <p className="text-[11px] text-text-tertiary uppercase tracking-wide">Registry CTR</p>
                    <p className="text-xl font-semibold text-text-primary">{analyticsSnapshot.registryCtr}%</p>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-secondary/40 px-3 py-2">
                    <p className="text-[11px] text-text-tertiary uppercase tracking-wide">FAQ Interaction</p>
                    <p className="text-xl font-semibold text-text-primary">{analyticsSnapshot.faqInteractionRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="bordered" padding="lg" className="shadow-sm">
              <CardHeader>
                <CardTitle>Connector health</CardTitle>
                <CardDescription>How connected your core modules are</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between py-2 border-b border-border-subtle">
                    <span className="text-text-secondary">Itinerary → Photos</span>
                    <span className={stats && stats.photoAlbumCount > 0 ? 'text-success font-medium' : 'text-text-tertiary'}>
                      {stats && stats.photoAlbumCount > 0 ? `${stats.photoAlbumCount} album(s)` : 'Not connected'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border-subtle">
                    <span className="text-text-secondary">Photos → Messages</span>
                    <span className={stats && stats.activePhotoAlbumCount > 0 ? 'text-success font-medium' : 'text-text-tertiary'}>
                      {stats && stats.activePhotoAlbumCount > 0 ? `${stats.activePhotoAlbumCount} active album(s)` : 'No active albums'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border-subtle">
                    <span className="text-text-secondary">RSVP → Guests</span>
                    <span className={stats && stats.totalGuests > 0 ? 'text-success font-medium' : 'text-text-tertiary'}>
                      {stats && stats.totalGuests > 0 ? `${stats.totalGuests} guest(s)` : 'No guests yet'}
                    </span>
                  </div>
                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/photos')}>Open photos</Button>
                    <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/messages')}>Open messages</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="bordered" padding="lg" className="shadow-sm">
              <CardHeader>
                <CardTitle>Setup checklist</CardTitle>
                <CardDescription>
                  {setupCompletedCount}/{setupChecklist.length} complete
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {setupChecklist.map((item) => (
                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 border-b border-border-subtle last:border-0">
                      <label className="flex items-center gap-3 text-sm text-text-primary">
                        <input type="checkbox" checked={item.done} readOnly className="h-4 w-4 rounded border-border" />
                        <span className={item.done ? 'line-through text-text-secondary' : ''}>{item.label}</span>
                      </label>
                      {!item.done && (
                        <Button variant="ghost" size="sm" onClick={item.action}>
                          {item.actionLabel}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </>
        )}
      </div>
    </DashboardLayout>
  );
};
