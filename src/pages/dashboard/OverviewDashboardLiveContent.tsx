import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui';
import { ExternalLink, Eye } from 'lucide-react';
import { formatOverviewRelativeTime, formatOverviewWeddingDate } from './overviewDate';
import { buildOverviewDashboardModel } from './buildOverviewDashboardModel';
import { buildNameChangeOverviewCardModel } from './nameChangeOverviewCard';
import type { NameChangeOverviewInsights } from './nameChangeOverviewInsights';
import type { BuilderRevision } from '../../builder/services/versionHistory';
import { isAttendingRsvpStatus } from '../../lib/rsvpStatus';
import type { OverviewStatsState } from './buildOverviewSnapshotState';
import {
  DASHBOARD_HOME_PIN_STORAGE_KEY,
  DEFAULT_DASHBOARD_TOOLS,
  getAllDashboardTools,
  readStoredToolPins,
  type DashboardToolId,
} from './dashboardToolLibrary';

type OverviewDashboardModel = ReturnType<typeof buildOverviewDashboardModel>;
type NameChangeOverviewCard = ReturnType<typeof buildNameChangeOverviewCardModel>;

type DraftBriefItem = {
  id: string;
  label: string;
  questionKey: string;
  value: string;
};

type OverviewLiveContentProps = {
  coupleLabel: string;
  dashboardModel: OverviewDashboardModel;
  draftBrief: DraftBriefItem[];
  heroVenueLine: string;
  interactiveLoading: boolean;
  interactiveSuggestions: Array<{
    created_at: string;
    id: string;
    suggestion_text: string;
  }>;
  interactiveVoteSummaries: Array<{
    key: string;
    latestAt: string;
    options: Array<{ optionId: string; percentage: number }>;
    total: number;
    widgetId: string;
    widgetKind: string;
  }>;
  nameChangeCard: NameChangeOverviewCard;
  nameChangeInsights: NameChangeOverviewInsights;
  navigate: (href: string) => void;
  nextStepAction: () => void;
  nextStepActionLabel: string;
  nextStepLabel: string;
  onDismissInvisibleSuggestion: (id: string) => void;
  onHideSuggestion: (id: string) => void;
  onRefreshDraftFromBrief: () => void;
  recentSiteActivity: BuilderRevision[];
  refreshingBrief: boolean;
  setShowMoreDetail: React.Dispatch<React.SetStateAction<boolean>>;
  setupChecklistLength: number;
  setupCompletedCount: number;
  setupDraftProgressPercent: number;
  setupProgressRatio: number;
  showInternalProof: boolean;
  showMoreDetail: boolean;
  stats: OverviewStatsState | null;
};

function openSitePreview(slug: string, isLive: boolean) {
  if (!isLive) {
    window.location.assign('/dashboard/builder');
    return;
  }
  window.open(`/site/${slug}`, '_blank', 'noopener,noreferrer');
}

export function OverviewDashboardLiveContent({
  coupleLabel,
  dashboardModel,
  heroVenueLine,
  navigate,
  recentSiteActivity,
  setShowMoreDetail,
  showMoreDetail,
  stats,
}: OverviewLiveContentProps) {
  const {
    contactCoverage,
    publishBlockers,
    responseRate,
    siteVisibility,
    websiteInviteAnalytics,
    websiteInviteAnalyticsFunnel,
  } = dashboardModel;

  const [homePins, setHomePins] = React.useState<DashboardToolId[]>([]);

  React.useEffect(() => {
    const syncPins = () => setHomePins(readStoredToolPins(DASHBOARD_HOME_PIN_STORAGE_KEY));
    syncPins();
    window.addEventListener('dayof:dashboard-tool-pins-changed', syncPins);
    window.addEventListener('storage', syncPins);
    return () => {
      window.removeEventListener('dayof:dashboard-tool-pins-changed', syncPins);
      window.removeEventListener('storage', syncPins);
    };
  }, []);

  const weddingDateLabel = stats?.weddingDate ? formatOverviewWeddingDate(stats.weddingDate) : 'Date not set yet';
  const guestTotal = stats?.totalGuests ?? 0;
  const pendingGuests = stats?.pendingGuests ?? 0;
  const memoryCount = (stats?.newPhotoUploadCount ?? 0) + (stats?.vaultCount ?? 0);
  const defaultWorkspaceTools = DEFAULT_DASHBOARD_TOOLS.filter((tool) => tool.id !== 'overview' && tool.id !== 'tools');
  const pinnedWorkspaceTools = getAllDashboardTools().filter((tool) => homePins.includes(tool.id));
  const workspaceTools = [...defaultWorkspaceTools, ...pinnedWorkspaceTools.filter((tool) => !defaultWorkspaceTools.some((base) => base.id === tool.id))].slice(0, 9);
  const rsvpOutcome = guestTotal === 0
    ? 'Ready when guests are added'
    : (responseRate ?? 0) >= 70
      ? 'Most have replied'
      : pendingGuests > 0
        ? 'Waiting on replies'
        : 'Replies are gathered';
  const statusItems = [
    { label: 'Site', value: siteVisibility.isLive ? 'Guest-ready' : siteVisibility.shortLabel },
    { label: 'Guests', value: guestTotal > 0 ? `${guestTotal.toLocaleString()} added` : 'Ready to add' },
    { label: 'RSVPs', value: rsvpOutcome },
    { label: 'Registry', value: (stats?.registryItemCount ?? 0) > 0 ? 'Ready for guests' : 'Ready to add' },
    { label: 'Memories', value: memoryCount > 0 ? 'New moments collected' : 'Ready to collect' },
  ];

  const recentActivityItems = [
    recentSiteActivity[0] ? {
      label: recentSiteActivity[0].action === 'publish' ? 'Site was published' : recentSiteActivity[0].action === 'rollback' ? 'An earlier site version was restored' : 'Website draft was saved',
      detail: `${formatOverviewRelativeTime(recentSiteActivity[0].createdAtISO)} by ${recentSiteActivity[0].actor}`,
      href: '/dashboard/builder',
    } : null,
    stats?.recentRsvps?.[0] ? {
      label: `${stats.recentRsvps[0].guestName || 'A guest'} replied`,
      detail: isAttendingRsvpStatus(stats.recentRsvps[0].status) ? 'Attending response received' : 'RSVP response received',
      href: '/dashboard/guests',
    } : null,
    (stats?.newPhotoUploadCount ?? 0) > 0 ? {
      label: `${stats?.newPhotoUploadCount ?? 0} new photo upload${(stats?.newPhotoUploadCount ?? 0) === 1 ? '' : 's'}`,
      detail: 'Guest memories are waiting in Memories.',
      href: '/dashboard/photos',
    } : null,
    (stats?.messageReviewCount ?? 0) > 0 ? {
      label: `${stats?.messageReviewCount ?? 0} message${(stats?.messageReviewCount ?? 0) === 1 ? '' : 's'} worth reviewing`,
      detail: 'Drafts and delivery details stay in Messages.',
      href: '/dashboard/messages',
    } : null,
  ].filter(Boolean) as Array<{ label: string; detail: string; href: string }>;

  const suggestions = [
    {
      title: 'Preview what guests will see before you share.',
      detail: 'Open the guest-facing site and check the details in context.',
      action: stats?.siteSlug ? () => openSitePreview(stats.siteSlug!, siteVisibility.isLive) : () => navigate('/dashboard/builder'),
      label: siteVisibility.isLive ? 'Preview site' : 'Preview draft',
    },
    guestTotal > 0 && (contactCoverage ?? 0) < 90 ? {
      title: 'Collect missing addresses without chasing people down.',
      detail: 'Send guests a private link so they can update mailing addresses and contact details.',
      action: () => navigate('/dashboard/guests?tool=address-collection'),
      label: 'Collect addresses',
    } : null,
    pendingGuests > 0 ? {
      title: 'Send a gentle RSVP reminder.',
      detail: 'Reach guests who have not replied without starting from scratch.',
      action: () => navigate('/dashboard/messages?template=rsvp-reminder'),
      label: 'Send reminder',
    } : null,
    memoryCount === 0 ? {
      title: 'Give guests one place to upload photos.',
      detail: 'Share a simple link or QR code before the celebration.',
      action: () => navigate('/dashboard/photos'),
      label: 'Share photo link',
    } : null,
  ].filter(Boolean).slice(0, 3) as Array<{ title: string; detail: string; action: () => void; label: string }>;

  return (
    <div className="space-y-9">
      <section className="border-b border-border-subtle pb-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Your wedding space</p>
            <h1 className="mt-4 max-w-3xl font-serif text-4xl font-normal leading-tight text-text-primary md:text-6xl">
              Everything guests need, in one calm place.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-text-secondary">
              Your site, guests, registry, messages, and memories are gathered here so the experience feels easier for everyone.
            </p>
            {heroVenueLine && <p className="mt-4 text-sm font-medium text-text-primary">{heroVenueLine}</p>}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {stats?.siteSlug && (
                <Button variant="primary" size="md" onClick={() => openSitePreview(stats.siteSlug!, siteVisibility.isLive)}>
                  <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                  {siteVisibility.isLive ? 'Preview site' : 'Preview draft'}
                </Button>
              )}
              <Button variant={stats?.siteSlug ? 'outline' : 'primary'} size="md" onClick={() => navigate('/dashboard/builder')}>
                Edit website
              </Button>
              <Button variant="outline" size="md" onClick={() => navigate('/dashboard/builder?tool=share')}>
                Share with guests
              </Button>
            </div>
          </div>
          <div className="rounded-[2rem] border border-border-subtle bg-white p-4 shadow-sm">
            <div className="overflow-hidden rounded-[1.5rem] border border-border-subtle bg-surface-subtle">
              <div className="bg-white px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Guest preview</p>
                    <p className="mt-1 font-serif text-2xl text-text-primary">{coupleLabel}</p>
                  </div>
                  <span className="rounded-full border border-border-subtle px-3 py-1 text-xs text-text-secondary">{siteVisibility.label}</span>
                </div>
              </div>
              <div className="min-h-[250px] bg-[linear-gradient(135deg,#f8f5f0_0%,#ffffff_42%,#f1ece4_100%)] p-6">
                <div className="max-w-sm">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary/75">{weddingDateLabel}</p>
                  <h2 className="mt-4 font-serif text-4xl leading-tight text-text-primary">Welcome to our wedding weekend.</h2>
                  <p className="mt-4 text-sm leading-6 text-text-secondary">Weekend details, RSVP, travel, registry, and photos stay easy to find.</p>
                  <div className="mt-6 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-white px-3 py-1 text-text-primary ring-1 ring-border-subtle">RSVP</span>
                    <span className="rounded-full bg-white px-3 py-1 text-text-primary ring-1 ring-border-subtle">Registry</span>
                    <span className="rounded-full bg-white px-3 py-1 text-text-primary ring-1 ring-border-subtle">Photos</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-x-8 gap-y-4 border-b border-border-subtle pb-7">
        {statusItems.map((item, index) => (
          <div key={item.label} className={index > 0 ? 'border-l border-border-subtle pl-6' : ''}>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-tertiary">{item.label}</p>
            <p className="mt-1 text-sm font-semibold text-text-primary">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl bg-white/80 p-5 shadow-sm ring-1 ring-border-subtle md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-normal text-text-primary">A few ways to make things smoother.</h2>
            <p className="mt-1 text-sm text-text-secondary">Keep the helpful next steps close, and open the deeper owner analytics only when you want them.</p>
          </div>
          <Button
            variant="outline"
            size="md"
            onClick={() => setShowMoreDetail((current) => !current)}
          >
            {showMoreDetail ? 'Hide detail' : 'Show more detail'}
          </Button>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {suggestions.map((suggestion) => (
            <button key={suggestion.title} type="button" onClick={suggestion.action} className="rounded-2xl border border-border-subtle bg-white p-5 text-left transition hover:border-primary/30 hover:shadow-sm">
              <h3 className="text-base font-semibold text-text-primary">{suggestion.title}</h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{suggestion.detail}</p>
              <p className="mt-4 text-sm font-semibold text-primary">{suggestion.label}</p>
            </button>
          ))}
        </div>
      </section>

      {showMoreDetail && (
        <section className="rounded-3xl border border-border-subtle bg-white p-5 md:p-6">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h2 className="font-serif text-2xl font-normal text-text-primary">Website and invite analytics</h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{websiteInviteAnalytics.summary}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {websiteInviteAnalytics.signals.map((signal) => (
                  <div key={signal.id} className="rounded-2xl border border-border-subtle bg-surface-subtle/40 p-4">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-tertiary">{signal.label}</p>
                    <p className="mt-2 text-xl font-semibold text-text-primary">{signal.value}</p>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">{signal.detail}</p>
                    <p className="mt-3 text-xs text-text-tertiary">{signal.privacy}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-border-subtle bg-surface-subtle/40 p-4">
                <h3 className="font-serif text-xl font-normal text-text-primary">Guest journey funnel</h3>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{websiteInviteAnalyticsFunnel.summary}</p>
                <div className="mt-4 space-y-3">
                  {websiteInviteAnalyticsFunnel.steps.map((step) => (
                    <div key={step.id} className="rounded-xl bg-white p-3 ring-1 ring-border-subtle">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm font-semibold text-text-primary">{step.label}</p>
                        <p className="text-sm font-semibold text-primary">{step.value}</p>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-text-secondary">{step.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border-subtle bg-surface-subtle/40 p-4">
                <h3 className="font-serif text-xl font-normal text-text-primary">Privacy guardrails</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-text-secondary">
                  {websiteInviteAnalyticsFunnel.guardrails.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-border-subtle bg-white p-5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-normal text-text-primary">Your workspace</h2>
            <p className="mt-1 text-sm text-text-secondary">Bring forward the tools you use most. Keep the rest tucked away.</p>
          </div>
          <Link to="/dashboard/tools" className="inline-flex min-h-[42px] items-center justify-center rounded-lg border border-border-subtle px-4 py-2 text-sm font-semibold text-text-primary no-underline hover:bg-surface-subtle">
            Customize tools
          </Link>
        </div>
        <div className="mt-5 divide-y divide-border-subtle">
          {workspaceTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.id} to={tool.path} className="block py-4 no-underline transition hover:bg-surface-subtle/40">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-text-primary">{tool.name}</h3>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">{tool.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <h2 className="font-serif text-2xl font-normal text-text-primary">Recent activity</h2>
          <p className="mt-1 text-sm text-text-secondary">Quiet updates from the parts of the wedding guests touch most.</p>
          <div className="mt-5">
            {recentActivityItems.length === 0 ? (
              <div className="rounded-2xl border border-border-subtle bg-white/85 p-5">
                <p className="text-sm font-semibold text-text-primary">Nothing new here yet.</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  As guests RSVP, photos arrive, messages send, and the site changes, the latest updates will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border-subtle rounded-2xl border border-border-subtle bg-white">
                {recentActivityItems.slice(0, 5).map((item) => (
                  <Link key={`${item.label}-${item.detail}`} to={item.href} className="block p-4 no-underline hover:bg-surface-subtle/40">
                    <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                    <p className="mt-1 text-xs text-text-secondary">{item.detail}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-border-subtle bg-white p-5 md:p-6">
          <h2 className="font-serif text-2xl font-normal text-text-primary">Share with guests</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">Preview the experience, share the site, or open the guest-facing memory tools.</p>
          <div className="mt-5 grid gap-3">
            <Button variant="primary" size="md" onClick={() => stats?.siteSlug ? openSitePreview(stats.siteSlug, siteVisibility.isLive) : navigate('/dashboard/builder')}>
              <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
              {siteVisibility.isLive ? 'Preview what guests will see' : 'Open your draft preview'}
            </Button>
            <Button variant="outline" size="md" onClick={() => navigate('/dashboard/builder?tool=share')}>
              Share site
            </Button>
            <Button variant="outline" size="md" onClick={() => navigate('/dashboard/photos')}>
              Share photo upload link
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
