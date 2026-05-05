import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, Camera, ClipboardList, Gift, HeartHandshake, MapPin, Plane, QrCode, RefreshCw, Sparkles, WifiOff } from 'lucide-react';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { OwnerPreviewBanner } from '../components/site/OwnerPreviewBanner';
import { customerSafeErrorMessage } from '../lib/customerSafeError';
import { buildGuestHubActions, type GuestHubActionId } from '../lib/guestHubActions';
import { readStoredGuestLanguage, resolveGuestLanguagePreference, writeStoredGuestLanguage } from '../lib/guestLanguagePreference';
import { buildDayOfHubStatusBoard, buildDayOfWebModeReadiness, type DayOfWebActionId } from '../lib/dayOfWebModeReadiness';
import { buildTravelGuestJourney } from '../lib/travelGuestPortal';

type HubAction = {
  id: GuestHubActionId;
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  primary?: boolean;
};

type HubSettings = {
  rsvp_enabled: boolean;
  photos_enabled: boolean;
  guestbook_enabled: boolean;
  registry_enabled: boolean;
  schedule_enabled: boolean;
  travel_enabled: boolean;
  custom_message: string | null;
  language_default: string;
};

type HubSiteSummary = {
  slug: string;
  coupleName1: string | null;
  coupleName2: string | null;
  weddingDate: string | null;
};

type HubConfigStatus = 'loading' | 'ready' | 'fallback' | 'offline';

const normalizeSiteRef = (value?: string) => (value ?? '').trim().toLowerCase();
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const buildGuestHubAccessPayload = (slug: string, searchParams: URLSearchParams) => ({
  inviteToken: searchParams.get('token') ?? sessionStorage.getItem(`dayof_invite_token_${slug}`),
  passwordSession: sessionStorage.getItem(`dayof_pw_session_${slug}`),
});

export const buildGuestHubAccessHeaders = (slug: string, searchParams: URLSearchParams) => {
  const access = buildGuestHubAccessPayload(slug, searchParams);
  return {
    ...(access.inviteToken ? { 'x-dayof-invite-token': access.inviteToken } : {}),
    ...(access.passwordSession ? { 'x-dayof-password-session': access.passwordSession } : {}),
  };
};

const formatHubWeddingDate = (value: string | null | undefined) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
};

export const friendlyGuestHubError = (err: unknown, fallback: string) => {
  return customerSafeErrorMessage(err, fallback, {
    allow: [/^Add an email or phone first\.$/i],
  });
};

export const formatEventHubCoupleLabel = (
  slug: string,
  coupleName1?: string | null,
  coupleName2?: string | null
) => {
  const names = [coupleName1, coupleName2]
    .map((name) => name?.trim())
    .filter(Boolean) as string[];
  if (names.length > 0) return names.join(' & ');

  const words = slug
    .replace(/[_+]+/g, '-')
    .split('-')
    .map((part) => part.trim())
    .filter(Boolean);
  const andIndex = words.findIndex((part) => part.toLowerCase() === 'and');
  const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

  if (andIndex > 0 && andIndex < words.length - 1) {
    const left = words.slice(0, andIndex).map(titleCase).join(' ');
    const right = words.slice(andIndex + 1).map(titleCase).join(' ');
    return `${left} & ${right}`;
  }

  return words.map(titleCase).join(' ') || slug;
};

const defaultSettings: HubSettings = {
  rsvp_enabled: true,
  photos_enabled: true,
  guestbook_enabled: true,
  registry_enabled: true,
  schedule_enabled: true,
  travel_enabled: true,
  custom_message: null,
  language_default: 'en',
};

const actionIcons: Record<GuestHubActionId, React.ComponentType<{ className?: string }>> = {
  rsvp: ClipboardList,
  schedule: CalendarDays,
  travel: Plane,
  registry: Gift,
  photos: Camera,
  guestbook: HeartHandshake,
  recap: Sparkles,
};

const formatLocalizedActionSummary = (actions: Pick<HubAction, 'title'>[]) => {
  const titles = actions.map((action) => action.title).filter(Boolean);
  if (titles.length === 0) return '';
  return titles.join(' · ');
};

export const shouldOpenHubDetailsByDefault = (params: URLSearchParams) => {
  return params.get('mobileSmoke') === '1' || params.get('hubDetails') === '1';
};

export const EventHub: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { siteRef } = useParams();
  const slug = normalizeSiteRef(siteRef);
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dayof.love';
  const [settings, setSettings] = useState<HubSettings>(defaultSettings);
  const [siteSummary, setSiteSummary] = useState<HubSiteSummary | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');
  const [wantsOwnEventInfo, setWantsOwnEventInfo] = useState(false);
  const [savingOptIn, setSavingOptIn] = useState(false);
  const [optInStatus, setOptInStatus] = useState<string | null>(null);
  const [hubConfigStatus, setHubConfigStatus] = useState<HubConfigStatus>('loading');
  const [hubConfigRetryKey, setHubConfigRetryKey] = useState(0);

  const actions = useMemo<HubAction[]>(() => buildGuestHubActions(slug, settings).map((action) => ({
    id: action.id,
    title: t(action.titleKey),
    description: t(action.detailKey),
    href: action.href,
    icon: actionIcons[action.id],
    primary: action.primary,
  })), [settings, slug, t]);

  useEffect(() => {
    if (!slug) return;
    if (searchParams.has('hubQaConfigFallback')) {
      setHubConfigStatus('fallback');
      return;
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      setHubConfigStatus('ready');
      return;
    }
    let cancelled = false;
    const headers = { apikey: supabaseAnonKey, ...buildGuestHubAccessHeaders(slug, searchParams) };
    setHubConfigStatus(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'loading');
    fetch(`${supabaseUrl}/functions/v1/guest-hub-config?site=${encodeURIComponent(slug)}`, { headers })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!cancelled && data?.settings) {
          const nextSettings = { ...defaultSettings, ...data.settings };
          setSettings(nextSettings);
          if (data.site) {
            setSiteSummary({
              slug: typeof data.site.slug === 'string' ? data.site.slug : slug,
              coupleName1: typeof data.site.coupleName1 === 'string' ? data.site.coupleName1 : null,
              coupleName2: typeof data.site.coupleName2 === 'string' ? data.site.coupleName2 : null,
              weddingDate: typeof data.site.weddingDate === 'string' ? data.site.weddingDate : null,
            });
          }
          const languagePreference = resolveGuestLanguagePreference({
            search: searchParams,
            storedLanguage: readStoredGuestLanguage(),
            siteDefaultLanguage: nextSettings.language_default,
          });
          if (languagePreference.language !== i18n.language?.split('-')[0]?.toLowerCase()) {
            void i18n.changeLanguage(languagePreference.language);
          }
          if (languagePreference.source === 'guest-link') {
            writeStoredGuestLanguage(languagePreference.language);
          }
          setHubConfigStatus('ready');
        } else if (!cancelled) {
          setHubConfigStatus(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'fallback');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHubConfigStatus(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'fallback');
        }
      });
    fetch(`${supabaseUrl}/functions/v1/guest-hub-track`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteSlug: slug, eventType: 'view', target: '/event', ...buildGuestHubAccessPayload(slug, searchParams) }),
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [hubConfigRetryKey, i18n, searchParams, slug]);

  const trackClick = (target: string) => {
    if (!slug || !supabaseUrl || !supabaseAnonKey) return;
    fetch(`${supabaseUrl}/functions/v1/guest-hub-track`, {
      method: 'POST',
      headers: { apikey: supabaseAnonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteSlug: slug, eventType: 'click', target, ...buildGuestHubAccessPayload(slug, new URLSearchParams(window.location.search)) }),
    }).catch(() => {});
  };

  const submitOptIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!slug || !supabaseUrl || !supabaseAnonKey || savingOptIn) return;
    const contact = guestContact.trim();
    if (!contact) {
      setOptInStatus(t('guest_hub.need_contact'));
      return;
    }
    setSavingOptIn(true);
      setOptInStatus(null);
    const isEmail = contact.includes('@');
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/guest-prospect-submit`, {
        method: 'POST',
        headers: { apikey: supabaseAnonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteSlug: slug,
          guestName,
          email: isEmail ? contact : '',
          phone: isEmail ? '' : contact,
          wantsPhotoUpdates: true,
          wantsOwnEventInfo,
          source: 'guest_hub',
          ...buildGuestHubAccessPayload(slug, searchParams),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || t('guest_hub.could_not_save'));
      setOptInStatus(t('guest_hub.saved_recap'));
      setGuestContact('');
    } catch (err) {
      setOptInStatus(friendlyGuestHubError(err, t('guest_hub.could_not_save')));
    } finally {
      setSavingOptIn(false);
    }
  };

  if (!slug) {
    return (
      <div className="min-h-screen bg-neutral-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-xl rounded-lg border border-white/10 bg-white/10 p-6">
          <h1 className="text-3xl font-semibold">{t('guest_hub.missing_title')}</h1>
          <p className="mt-3 text-white/75">{t('guest_hub.missing_subtitle')}</p>
        </div>
      </div>
    );
  }

  const hubUrl = `${origin}/event/${encodeURIComponent(slug)}`;
  const coupleLabel = formatEventHubCoupleLabel(slug, siteSummary?.coupleName1, siteSummary?.coupleName2);
  const weddingDateLabel = formatHubWeddingDate(siteSummary?.weddingDate);
  const actionSummary = formatLocalizedActionSummary(actions);
  const dayOfModeReadiness = buildDayOfWebModeReadiness({
    siteSlug: slug,
    enabledActionIds: actions.map((action) => action.id).filter((id): id is DayOfWebActionId => (
      id === 'rsvp' || id === 'schedule' || id === 'travel' || id === 'registry' || id === 'photos' || id === 'guestbook' || id === 'recap'
    )),
    hasCustomMessage: Boolean(settings.custom_message?.trim()),
    hasWeddingDate: Boolean(siteSummary?.weddingDate),
    hasGuestLanguagePreference: searchParams.has('guestLang') || searchParams.has('lang') || Boolean(readStoredGuestLanguage()),
    hasPoorNetworkFallback: true,
  });
  const dayOfActionIds = actions.map((action) => action.id).filter((id): id is DayOfWebActionId => (
    id === 'rsvp' || id === 'schedule' || id === 'travel' || id === 'registry' || id === 'photos' || id === 'guestbook' || id === 'recap'
  ));
  const dayOfHubStatusBoard = buildDayOfHubStatusBoard({
    enabledActionIds: dayOfActionIds,
    hasPoorNetworkFallback: true,
  });
  const travelGuestJourney = buildTravelGuestJourney({
    siteSlug: slug,
    enabledActionIds: actions.map((action) => action.id),
  });

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
                  {settings.custom_message || t('guest_hub.default_message')}
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

              {hubConfigStatus !== 'ready' && (
                <div className="mt-5 rounded-lg border border-[#eadfd2] bg-[#fffdf9] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-3">
                      {hubConfigStatus === 'offline' ? (
                        <WifiOff className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#8b6f53]" />
                      ) : (
                        <RefreshCw className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#8b6f53]" />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-[#2f261d]">
                          {hubConfigStatus === 'loading' ? 'Loading the latest wedding details' : 'Showing the saved guest hub'}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[#6f5843]">
                          {hubConfigStatus === 'loading'
                            ? 'The hub will stay usable while the newest details load.'
                            : 'Travel, RSVP, and photo links are still available. Try again when the connection feels steadier.'}
                        </p>
                      </div>
                    </div>
                    {hubConfigStatus !== 'loading' && (
                      <button
                        type="button"
                        onClick={() => setHubConfigRetryKey((value) => value + 1)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d8c8b6] px-3 py-2 text-xs font-semibold text-[#69513f] transition-colors hover:bg-[#f3eadf]"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Try again
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-8 space-y-3">
                {actions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.title}
                      to={action.href}
                      onClick={() => trackClick(action.href)}
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
                    const stepContent = (
                      <>
                        <span className="block text-xs font-semibold text-[#2f261d]">{step.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-[#6f5843]">{step.detail}</span>
                      </>
                    );
                    return step.href ? (
                      <Link
                        key={step.id}
                        to={step.href}
                        onClick={() => trackClick(step.href)}
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

              <form onSubmit={submitOptIn} className="mt-5 rounded-lg border border-[#eadfd2] bg-[#fffdf9] p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#2f261d]">{t('guest_hub.recap_heading')}</p>
                    <p className="mt-1 text-sm text-[#6f5843]">{t('guest_hub.recap_detail')}</p>
                  </div>
                  <input
                    value={guestName}
                    onChange={(event) => setGuestName(event.target.value)}
                    placeholder={t('guest_hub.name_placeholder')}
                    className="rounded-lg border border-[#eadfd2] bg-white px-4 py-3 text-sm outline-none lg:w-44"
                  />
                  <input
                    value={guestContact}
                    onChange={(event) => setGuestContact(event.target.value)}
                    placeholder={t('guest_hub.contact_placeholder')}
                    className="rounded-lg border border-[#eadfd2] bg-white px-4 py-3 text-sm outline-none lg:w-56"
                  />
                  <button disabled={savingOptIn} className="rounded-lg bg-[#2f261d] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                    {savingOptIn ? t('guest_hub.saving') : t('guest_hub.send_recap')}
                  </button>
                </div>
                <label className="mt-3 flex items-start gap-2 text-xs text-[#6f5843]">
                  <input type="checkbox" checked={wantsOwnEventInfo} onChange={(event) => setWantsOwnEventInfo(event.target.checked)} className="mt-0.5" />
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
};

export default EventHub;
