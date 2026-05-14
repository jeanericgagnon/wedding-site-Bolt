import { Link } from 'react-router-dom';
import { MapPin, QrCode } from 'lucide-react';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { OwnerPreviewBanner } from '../components/site/OwnerPreviewBanner';
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

type TravelGuestJourneyStep = {
  id: string;
  label: string;
  detail: string;
  href?: string;
  status: 'ready' | 'needs-content' | 'needs-info' | 'planned';
};

type TravelHubSpotlightCard = {
  id: 'hotel' | 'room-block' | 'shuttle' | 'visa-tip' | 'cultural-tip' | 'event-window' | 'venue-route';
  label: string;
  detail: string;
};

type TravelHubSpotlight = {
  summary: string;
  travelHref: string;
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

              <div className="mt-8 rounded-lg border border-[#eadfd2] bg-[#fffdf9] p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#2f261d]">Travel guest path</p>
                    <p className="mt-1 text-sm leading-6 text-[#6f5843]">
                      Start with travel details, then reply and share photos from the same mobile hub.
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#f3eadf] px-3 py-2 text-xs font-semibold text-[#69513f]">
                    {travelGuestJourney.filter((step) => step.status === 'ready').length} ready
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {travelGuestJourney.map((step) => {
                    const stepHref = step.href;
                    const stepContent = (
                      <>
                        <span className="block text-xs font-semibold text-[#2f261d]">{step.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-[#6f5843]">{step.detail}</span>
                      </>
                    );
                    return stepHref ? (
                      <Link
                        key={step.id}
                        to={stepHref}
                        onClick={() => onTrackClick(stepHref)}
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
                      <p className="text-sm font-semibold text-[#2f261d]">Travel quick plan</p>
                      <p className="mt-1 text-sm leading-6 text-[#6f5843]">{travelHubSpotlight.summary}</p>
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
                      <div key={card.id} className="rounded-lg border border-[#eadfd2] bg-[#fbf7f1] px-3 py-2">
                        <p className="text-xs font-semibold text-[#2f261d]">{card.label}</p>
                        <p className="mt-1 text-xs leading-5 text-[#6f5843]">{card.detail}</p>
                      </div>
                    ))}
                  </div>
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
                      <p className="text-sm font-semibold text-[#2f261d]">Hub details</p>
                      <p className="mt-1 text-sm leading-6 text-[#6f5843]">Check what is ready before relying on the hub at the venue.</p>
                    </div>
                    <span className="rounded-lg bg-[#f3eadf] px-3 py-2 text-xs font-semibold text-[#69513f]">
                      {dayOfHubStatusBoard.readyCount} live-safe
                    </span>
                  </div>
                </summary>
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#2f261d]">Day-of web mode</p>
                        <p className="mt-1 text-sm leading-6 text-[#6f5843]">{dayOfModeReadiness.summary}</p>
                      </div>
                      <div className="rounded-lg bg-[#f3eadf] px-3 py-2 text-xs font-semibold text-[#69513f]">
                        {dayOfModeReadiness.readyCount} ready
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {dayOfModeReadiness.signals.slice(0, 4).map((signal) => (
                        <div key={signal.id} className="rounded-lg border border-[#eadfd2] bg-[#fbf7f1] px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-[#2f261d]">{signal.label}</p>
                            <span className="text-[11px] font-medium text-[#8b6f53]">
                              {signal.state === 'ready' ? 'Ready' : signal.state === 'needs-content' ? 'Needs info' : 'Planned'}
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
                        <p className="text-sm font-semibold text-[#2f261d]">Guest hub status</p>
                        <p className="mt-1 text-sm leading-6 text-[#6f5843]">{dayOfHubStatusBoard.summary}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {dayOfHubStatusBoard.items.map((item) => (
                        <div key={item.id} className="rounded-lg border border-[#eadfd2] bg-[#fbf7f1] px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-[#2f261d]">{item.label}</p>
                            <span className="text-[11px] font-medium text-[#8b6f53]">
                              {item.state === 'ready' ? 'Ready' : item.state === 'needs-content' ? 'Needs info' : 'Planned'}
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
