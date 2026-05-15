import { Link } from 'react-router-dom';
import { MapPin, QrCode } from 'lucide-react';
import { OwnerPreviewBanner } from '../components/site/OwnerPreviewBanner';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { EventHubConfigStatusCard } from './EventHubConfigStatusCard';

type DayOfModeSignal = {
  id: string;
  label: string;
  detail: string;
  state: 'ready' | 'needs-content' | 'planned';
};

type DayOfModeReadiness = {
  readyCount: number;
  summary: string;
  signals: DayOfModeSignal[];
};

type DayOfHubStatusItem = {
  id: string;
  label: string;
  detail: string;
  state: 'ready' | 'needs-content' | 'planned';
};

type DayOfHubStatusBoard = {
  readyCount: number;
  summary: string;
  items: DayOfHubStatusItem[];
};

type GuestHubAnnouncementCard = {
  title: string;
  detail: string;
  stateLabel: string;
  stateExplainer: string;
  timingLabel: string | null;
};

type GuestHubGuestStateCard = {
  guestLabel: string;
  rsvpLabel: string;
  checkInLabel: string;
  summary: string;
};

type GuestHubCoordinatorHandoffCard = {
  eventLabel: string;
  statusLabel: string;
  staffLabel: string;
  noteLabel: string;
  updatedLabel: string | null;
  summary: string;
};

type GuestHubLinkAccessCard = {
  title: string;
  badgeLabel: string;
  detail: string;
  summary: string;
  actionCountLabel?: string | null;
  actionSummaryLabel?: string | null;
  readyCoreActionCountLabel?: string | null;
  coreActionCoverageLabel?: string | null;
  coreActionSummaryLabel?: string | null;
  mainGapLabel?: string | null;
};

type TravelGuestJourneyStep = {
  id: string;
  label: string;
  detail: string;
  href?: string;
  status: 'ready' | 'needs-content' | 'needs-info' | 'planned';
};

type TravelHubSpotlightCard = {
  id: string;
  label: string;
  detail: string;
  href?: string;
};

type TravelHubSpotlight = {
  summary: string;
  travelHref: string;
  badges: string[];
  mainGapLabel?: string | null;
  cards: TravelHubSpotlightCard[];
  shareText: string;
  htmlDocument: string;
  filename: string;
};

type HubAction = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  primary?: boolean;
};

type EventHubLiveContentProps = {
  t: (key: string, options?: Record<string, unknown>) => string;
  coupleLabel: string;
  weddingDateLabel: string | null;
  customMessage: string | null;
  actionSummary: string;
  hubConfigStatus: 'loading' | 'ready' | 'fallback' | 'offline';
  onRetryConfig: () => void;
  actions: HubAction[];
  onTrackClick: (target: string) => void;
  travelGuestJourney: TravelGuestJourneyStep[];
  travelHubSpotlight: TravelHubSpotlight | null;
  travelShareStatus: string | null;
  onCopyTravelPlan: () => void;
  onDownloadTravelGuide: () => void;
  hubUrl: string;
  searchParams: URLSearchParams;
  shouldOpenHubDetailsByDefault: (params: URLSearchParams) => boolean;
  dayOfHubStatusBoard: DayOfHubStatusBoard;
  dayOfModeReadiness: DayOfModeReadiness;
  announcementCard: GuestHubAnnouncementCard | null;
  guestStateCard: GuestHubGuestStateCard | null;
  coordinatorHandoffCard: GuestHubCoordinatorHandoffCard | null;
  linkAccessCard: GuestHubLinkAccessCard | null;
  guestName: string;
  guestContact: string;
  wantsOwnEventInfo: boolean;
  savingOptIn: boolean;
  optInStatus: string | null;
  onGuestNameChange: (value: string) => void;
  onGuestContactChange: (value: string) => void;
  onToggleOwnEventInfo: (checked: boolean) => void;
  onSubmitOptIn: (event: React.FormEvent) => void;
};

export function EventHubLiveContent({
  t,
  coupleLabel,
  weddingDateLabel,
  customMessage,
  actionSummary,
  hubConfigStatus,
  onRetryConfig,
  actions,
  onTrackClick,
  travelGuestJourney,
  travelHubSpotlight,
  travelShareStatus,
  onCopyTravelPlan,
  onDownloadTravelGuide,
  hubUrl,
  searchParams,
  shouldOpenHubDetailsByDefault,
  dayOfHubStatusBoard,
  dayOfModeReadiness,
  announcementCard,
  guestStateCard,
  coordinatorHandoffCard,
  linkAccessCard,
  guestName,
  guestContact,
  wantsOwnEventInfo,
  savingOptIn,
  optInStatus,
  onGuestNameChange,
  onGuestContactChange,
  onToggleOwnEventInfo,
  onSubmitOptIn,
}: EventHubLiveContentProps) {
  const isExternalHref = (href: string) => /^https?:\/\//i.test(href);
  const travelJourneyReadyCount = travelGuestJourney.filter((step) => step.status === 'ready').length;
  const travelJourneyNeedsInfoCount = travelGuestJourney.filter((step) => step.status !== 'ready').length;
  const travelJourneyReadyLabels = travelGuestJourney.filter((step) => step.status === 'ready').map((step) => step.label);
  const travelJourneyNeedsInfoLabels = travelGuestJourney.filter((step) => step.status !== 'ready').map((step) => step.label);
  const getTravelJourneyStatusLabel = (status: TravelGuestJourneyStep['status']) =>
    status === 'ready' ? 'Travel step ready' : 'Travel step needs setup';
  const getDayOfSignalStatusLabel = (state: DayOfModeSignal['state']) =>
    state === 'ready' ? 'Mode ready' : state === 'needs-content' ? 'Mode needs info' : 'Mode planned';
  const getHubStatusLabel = (state: DayOfHubStatusItem['state']) =>
    state === 'ready' ? 'Hub item ready' : state === 'needs-content' ? 'Hub item needs info' : 'Hub item planned';

  return (
    <div className="min-h-screen bg-[#fbf7f1] text-neutral-950">
      <OwnerPreviewBanner />
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 sm:py-10">
        <section className="overflow-hidden rounded-lg border border-[#eadfd2] bg-white">
          <div className="grid lg:grid-cols-[0.92fr_1.08fr]">
            <div className="relative min-h-[320px] bg-neutral-950 lg:min-h-full">
              <img
                src="/preview-photos/024-root-landscape.jpg"
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/44 to-black/10" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                <p className="text-xs font-semibold !text-white/75">{t('guest_hub.eyebrow')}</p>
                <h1 className="mt-3 text-4xl font-semibold !text-white sm:text-6xl">{coupleLabel}</h1>
                {weddingDateLabel && <p className="mt-3 text-sm font-medium !text-white/80">{weddingDateLabel}</p>}
                <p className="mt-4 max-w-md text-sm leading-6 !text-white opacity-85">
                  {customMessage || t('guest_hub.default_message')}
                </p>
              </div>
            </div>

            <div className="p-5 sm:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <LanguageSwitcher />
                <div className="ml-auto inline-flex items-center gap-2 rounded-lg bg-[#f3eadf] px-3 py-2 text-xs font-semibold text-[#69513f]">
                  <QrCode className="h-4 w-4" />
                  {t('guest_hub.qr_target')}
                </div>
              </div>

              <div className="mt-6">
                <p className="text-xs font-semibold text-[#8b6f53]">{t('guest_hub.title')}</p>
                <h2 className="mt-3 text-3xl font-semibold text-[#2f261d] sm:text-4xl">{t('guest_hub.headline')}</h2>
                <p className="mt-3 max-w-xl text-base leading-7 text-[#6f5843]">
                  {t('guest_hub.subtitle')}
                </p>
                <p className="mt-2 text-sm text-[#8b6f53]">
                  {t('guest_hub.enabled_actions', { actions: actionSummary })}
                </p>
              </div>

              <EventHubConfigStatusCard
                status={hubConfigStatus}
                onRetry={onRetryConfig}
              />

              <div className="mt-8 space-y-3">
                {actions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.title}
                      to={action.href}
                      onClick={() => onTrackClick(action.href)}
                      className={`group flex items-start gap-4 rounded-lg border p-4 transition-colors ${
                        action.primary
                          ? 'border-[#2f261d] bg-[#2f261d] text-white'
                          : 'border-[#eadfd2] bg-[#fffdf9] text-[#2f261d] hover:border-[#d8c8b6]'
                      }`}
                    >
                      <span className={`rounded-lg p-3 ${action.primary ? 'bg-white/10 text-white' : 'bg-[#f5e9db] text-[#8b6f53]'}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-lg font-semibold">{action.title}</span>
                        <span className={`mt-1 block text-sm leading-6 ${action.primary ? 'text-white/75' : 'text-[#6f5843]'}`}>{action.description}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>

              {(announcementCard || guestStateCard || coordinatorHandoffCard || linkAccessCard) && (
                <div id="day-of-updates" className="mt-8 scroll-mt-24 grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
                  {announcementCard && (
                    <div className="rounded-lg border border-[#eadfd2] bg-[#fffdf9] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#2f261d]">Latest update for this link</p>
                          <p className="mt-1 text-xs font-medium text-[#8b6f53]">{announcementCard.stateLabel}</p>
                        </div>
                        {announcementCard.timingLabel && (
                          <span className="rounded-lg bg-[#f3eadf] px-3 py-2 text-[11px] font-semibold text-[#69513f]">
                            {announcementCard.timingLabel}
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-sm font-semibold text-[#2f261d]">{announcementCard.title}</p>
                      <p className="mt-1 text-sm leading-6 text-[#6f5843]">{announcementCard.detail}</p>
                      <p className="mt-2 text-xs leading-5 text-[#8b6f53]">{announcementCard.stateExplainer}</p>
                    </div>
                  )}
                  {guestStateCard && (
                    <div className="rounded-lg border border-[#eadfd2] bg-[#fffdf9] p-4">
                      <p className="text-sm font-semibold text-[#2f261d]">Your status on this link</p>
                      <p className="mt-1 text-sm leading-6 text-[#6f5843]">{guestStateCard.summary}</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-lg border border-[#eadfd2] bg-[#fbf7f1] px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b6f53]">Guest on this link</p>
                          <p className="mt-1 text-sm font-semibold text-[#2f261d]">{guestStateCard.guestLabel}</p>
                        </div>
                        <div className="rounded-lg border border-[#eadfd2] bg-[#fbf7f1] px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b6f53]">RSVP on this link</p>
                          <p className="mt-1 text-sm font-semibold text-[#2f261d]">{guestStateCard.rsvpLabel}</p>
                        </div>
                        <div className="rounded-lg border border-[#eadfd2] bg-[#fbf7f1] px-3 py-2 sm:col-span-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b6f53]">Check-in on this link</p>
                          <p className="mt-1 text-sm font-semibold text-[#2f261d]">{guestStateCard.checkInLabel}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {coordinatorHandoffCard && (
                    <div className="rounded-lg border border-[#eadfd2] bg-[#fffdf9] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#2f261d]">Coordinator handoff status</p>
                          <p className="mt-1 text-xs font-medium text-[#8b6f53]">{coordinatorHandoffCard.statusLabel}</p>
                        </div>
                        {coordinatorHandoffCard.updatedLabel && (
                          <span className="rounded-lg bg-[#f3eadf] px-3 py-2 text-[11px] font-semibold text-[#69513f]">
                            {coordinatorHandoffCard.updatedLabel}
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-sm font-semibold text-[#2f261d]">{coordinatorHandoffCard.eventLabel}</p>
                      <p className="mt-1 text-sm leading-6 text-[#6f5843]">{coordinatorHandoffCard.summary}</p>
                      <div className="mt-3 grid gap-2">
                        <div className="rounded-lg border border-[#eadfd2] bg-[#fbf7f1] px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b6f53]">Assigned team</p>
                          <p className="mt-1 text-sm font-semibold text-[#2f261d]">{coordinatorHandoffCard.staffLabel}</p>
                        </div>
                        <div className="rounded-lg border border-[#eadfd2] bg-[#fbf7f1] px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b6f53]">Guest handoff note</p>
                          <p className="mt-1 text-sm leading-6 text-[#2f261d]">{coordinatorHandoffCard.noteLabel}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {linkAccessCard && (
                    <div className="rounded-lg border border-[#eadfd2] bg-[#fffdf9] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#2f261d]">What this link unlocks</p>
                          <p className="mt-1 text-xs font-medium text-[#8b6f53]">{linkAccessCard.badgeLabel}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-[#2f261d]">{linkAccessCard.title}</p>
                      <p className="mt-1 text-sm leading-6 text-[#6f5843]">{linkAccessCard.detail}</p>
                      <p className="mt-2 text-xs leading-5 text-[#8b6f53]">{linkAccessCard.summary}</p>
                      {(linkAccessCard.actionCountLabel || linkAccessCard.actionSummaryLabel) && (
                        <div className="mt-3 rounded-lg border border-[#eadfd2] bg-[#fbf7f1] px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b6f53]">Available from this link</p>
                          {linkAccessCard.actionCountLabel && (
                            <p className="mt-1 text-sm font-semibold text-[#2f261d]">{linkAccessCard.actionCountLabel}</p>
                          )}
                          {linkAccessCard.actionSummaryLabel && (
                            <p className="mt-1 text-xs leading-5 text-[#6f5843]">{linkAccessCard.actionSummaryLabel}</p>
                          )}
                        </div>
                      )}
                      {(linkAccessCard.readyCoreActionCountLabel || linkAccessCard.coreActionCoverageLabel || linkAccessCard.coreActionSummaryLabel) && (
                        <div className="mt-3 rounded-lg border border-[#eadfd2] bg-[#fbf7f1] px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b6f53]">Core day-of actions</p>
                          {linkAccessCard.readyCoreActionCountLabel && (
                            <p className="mt-1 text-sm font-semibold text-[#2f261d]">{linkAccessCard.readyCoreActionCountLabel}</p>
                          )}
                          {linkAccessCard.coreActionCoverageLabel && (
                            <p className="mt-1 text-sm font-semibold text-[#2f261d]">{linkAccessCard.coreActionCoverageLabel}</p>
                          )}
                          {linkAccessCard.coreActionSummaryLabel && (
                            <p className="mt-1 text-xs leading-5 text-[#6f5843]">{linkAccessCard.coreActionSummaryLabel}</p>
                          )}
                          {linkAccessCard.mainGapLabel && (
                            <p className="mt-1 text-xs leading-5 text-[#8b6f53]">{linkAccessCard.mainGapLabel}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8 rounded-lg border border-[#eadfd2] bg-[#fffdf9] p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#2f261d]">Travel steps from this link</p>
                    <p className="mt-1 text-sm leading-6 text-[#6f5843]">
                      Start with travel details, then reply and share photos from the same mobile hub.
                    </p>
                    {travelJourneyNeedsInfoCount > 0 && (
                      <p className="mt-2 text-xs text-[#8b6f53]">
                        {travelJourneyNeedsInfoCount} step{travelJourneyNeedsInfoCount === 1 ? '' : 's'} still need setup before this path feels complete.
                      </p>
                    )}
                    {travelJourneyReadyLabels.length > 0 && (
                      <p className="mt-2 text-xs text-[#8b6f53]">
                        Ready from this link: {travelJourneyReadyLabels.join(', ')}.
                      </p>
                    )}
                    {travelJourneyNeedsInfoLabels.length > 0 && (
                      <p className="mt-1 text-xs text-[#8b6f53]">
                        Still missing from this link: {travelJourneyNeedsInfoLabels.join(', ')}.
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg bg-[#f3eadf] px-3 py-2 text-xs font-semibold text-[#69513f]">
                    {travelJourneyReadyCount} ready{travelJourneyNeedsInfoCount > 0 ? ` · ${travelJourneyNeedsInfoCount} needs setup` : ''}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {travelGuestJourney.map((step) => {
                    const statusLabel = getTravelJourneyStatusLabel(step.status);
                    const stepContent = (
                      <>
                        <span className="flex items-center justify-between gap-3">
                          <span className="block text-xs font-semibold text-[#2f261d]">{step.label}</span>
                          <span className="rounded-lg bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8b6f53]">
                            {statusLabel}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-[#6f5843]">{step.detail}</span>
                      </>
                    );

                    return step.href ? (
                      <Link
                        key={step.id}
                        to={step.href}
                        onClick={() => onTrackClick(step.href!)}
                        className="rounded-lg border border-[#eadfd2] bg-[#fbf7f1] px-3 py-2 transition-colors hover:border-[#d8c8b6]"
                      >
                        {stepContent}
                      </Link>
                    ) : (
                      <div key={step.id} className="rounded-lg border border-[#eadfd2] bg-[#fbf7f1] px-3 py-2 opacity-70">
                        {stepContent}
                      </div>
                    );
                  })}
                </div>
              </div>

              {travelHubSpotlight && (
                <div className="mt-5 rounded-lg border border-[#eadfd2] bg-[#fffdf9] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#2f261d]">Travel plan from this link</p>
                      <p className="mt-1 text-sm leading-6 text-[#6f5843]">{travelHubSpotlight.summary}</p>
                      {travelHubSpotlight.mainGapLabel && (
                        <p className="mt-2 text-xs text-[#8b6f53]">{travelHubSpotlight.mainGapLabel}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={travelHubSpotlight.travelHref}
                        onClick={() => onTrackClick(travelHubSpotlight.travelHref)}
                        className="rounded-lg border border-[#eadfd2] bg-[#fbf7f1] px-3 py-2 text-xs font-semibold text-[#2f261d] transition-colors hover:border-[#d8c8b6]"
                      >
                        Open travel page
                      </Link>
                      <button
                        type="button"
                        onClick={onCopyTravelPlan}
                        className="rounded-lg border border-[#eadfd2] bg-[#fbf7f1] px-3 py-2 text-xs font-semibold text-[#2f261d] transition-colors hover:border-[#d8c8b6]"
                      >
                        Copy travel plan
                      </button>
                      <button
                        type="button"
                        onClick={onDownloadTravelGuide}
                        className="rounded-lg border border-[#eadfd2] bg-[#fbf7f1] px-3 py-2 text-xs font-semibold text-[#2f261d] transition-colors hover:border-[#d8c8b6]"
                      >
                        Save travel guide
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {travelHubSpotlight.cards.map((card) => (
                      card.href ? (
                        isExternalHref(card.href) ? (
                          <a
                            key={card.id}
                            href={card.href}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => onTrackClick(card.href!)}
                            className="rounded-lg border border-[#eadfd2] bg-[#fbf7f1] px-3 py-2 transition-colors hover:border-[#d8c8b6]"
                          >
                            <p className="text-xs font-semibold text-[#2f261d]">{card.label}</p>
                            <p className="mt-1 text-xs leading-5 text-[#6f5843]">{card.detail}</p>
                          </a>
                        ) : (
                          <Link
                            key={card.id}
                            to={card.href}
                            onClick={() => onTrackClick(card.href!)}
                            className="rounded-lg border border-[#eadfd2] bg-[#fbf7f1] px-3 py-2 transition-colors hover:border-[#d8c8b6]"
                          >
                            <p className="text-xs font-semibold text-[#2f261d]">{card.label}</p>
                            <p className="mt-1 text-xs leading-5 text-[#6f5843]">{card.detail}</p>
                          </Link>
                        )
                      ) : (
                        <div key={card.id} className="rounded-lg border border-[#eadfd2] bg-[#fbf7f1] px-3 py-2">
                          <p className="text-xs font-semibold text-[#2f261d]">{card.label}</p>
                          <p className="mt-1 text-xs leading-5 text-[#6f5843]">{card.detail}</p>
                        </div>
                      )
                    ))}
                  </div>
                  {travelHubSpotlight.badges.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {travelHubSpotlight.badges.map((badge) => (
                        <span
                          key={badge}
                          className="rounded-lg bg-[#f3eadf] px-3 py-2 text-[11px] font-semibold text-[#69513f]"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}
                  {travelShareStatus && <p className="mt-3 text-xs text-[#6f5843]">{travelShareStatus}</p>}
                </div>
              )}

              <div className="mt-8 rounded-lg border border-[#eadfd2] bg-[#fbf7f1] p-4">
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#8b6f53]" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#2f261d]">{t('guest_hub.save_link_heading')}</p>
                    <p className="mt-1 text-sm leading-6 text-[#6f5843]">{t('guest_hub.save_link_detail')}</p>
                    <p className="sr-only">{hubUrl}</p>
                  </div>
                </div>
              </div>

              <details open={shouldOpenHubDetailsByDefault(searchParams)} className="mt-5 rounded-lg border border-[#eadfd2] bg-[#fffdf9] p-4">
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#2f261d]">What is ready on this link</p>
                      <p className="mt-1 text-sm leading-6 text-[#6f5843]">Check what is ready before relying on the hub at the venue.</p>
                    </div>
                    <span className="rounded-lg bg-[#f3eadf] px-3 py-2 text-xs font-semibold text-[#69513f]">
                      {dayOfHubStatusBoard.readyCount} hub items ready
                    </span>
                  </div>
                </summary>
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#2f261d]">Day-of web readiness</p>
                        <p className="mt-1 text-sm leading-6 text-[#6f5843]">{dayOfModeReadiness.summary}</p>
                      </div>
                      <div className="rounded-lg bg-[#f3eadf] px-3 py-2 text-xs font-semibold text-[#69513f]">
                        {dayOfModeReadiness.readyCount} mode items ready
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {dayOfModeReadiness.signals.slice(0, 4).map((signal) => (
                        <div key={signal.id} className="rounded-lg border border-[#eadfd2] bg-[#fbf7f1] px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-[#2f261d]">{signal.label}</p>
                            <span className="text-[11px] font-medium text-[#8b6f53]">
                              {getDayOfSignalStatusLabel(signal.state)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-[#6f5843]">{signal.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#2f261d]">Hub readiness on this link</p>
                        <p className="mt-1 text-sm leading-6 text-[#6f5843]">{dayOfHubStatusBoard.summary}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {dayOfHubStatusBoard.items.map((item) => (
                        <div key={item.id} className="rounded-lg border border-[#eadfd2] bg-[#fbf7f1] px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-[#2f261d]">{item.label}</p>
                            <span className="text-[11px] font-medium text-[#8b6f53]">
                              {getHubStatusLabel(item.state)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-[#6f5843]">{item.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </details>

              <form onSubmit={onSubmitOptIn} className="mt-5 rounded-lg border border-[#eadfd2] bg-[#fffdf9] p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#2f261d]">{t('guest_hub.recap_heading')}</p>
                    <p className="mt-1 text-sm text-[#6f5843]">{t('guest_hub.recap_detail')}</p>
                  </div>
                  <input
                    value={guestName}
                    onChange={(event) => onGuestNameChange(event.target.value)}
                    placeholder={t('guest_hub.name_placeholder')}
                    className="rounded-lg border border-[#eadfd2] bg-white px-4 py-3 text-sm outline-none lg:w-44"
                  />
                  <input
                    value={guestContact}
                    onChange={(event) => onGuestContactChange(event.target.value)}
                    placeholder={t('guest_hub.contact_placeholder')}
                    className="rounded-lg border border-[#eadfd2] bg-white px-4 py-3 text-sm outline-none lg:w-56"
                  />
                  <button disabled={savingOptIn} className="rounded-lg bg-[#2f261d] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                    {savingOptIn ? t('guest_hub.saving') : t('guest_hub.send_recap')}
                  </button>
                </div>
                <label className="mt-3 flex items-start gap-2 text-xs text-[#6f5843]">
                  <input type="checkbox" checked={wantsOwnEventInfo} onChange={(event) => onToggleOwnEventInfo(event.target.checked)} className="mt-0.5" />
                  <span>{t('guest_hub.own_event')}</span>
                </label>
                {optInStatus && <p className="mt-3 text-sm text-[#6f5843]">{optInStatus}</p>}
              </form>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
