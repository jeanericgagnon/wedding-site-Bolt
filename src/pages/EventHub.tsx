import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Archive, CalendarDays, Camera, ClipboardList, Gift, HeartHandshake, Plane, Sparkles } from 'lucide-react';
import { copyTextOrDownload, downloadTextFile } from '../lib/copyText';
import { customerSafeErrorMessage } from '../lib/customerSafeError';
import { buildGuestHubActions, type GuestHubActionId } from '../lib/guestHubActions';
import { readStoredGuestLanguage, resolveGuestLanguagePreference, writeStoredGuestLanguage } from '../lib/guestLanguagePreference';
import { buildDayOfHubStatusBoard, buildDayOfWebModeReadiness, type DayOfWebActionId } from '../lib/dayOfWebModeReadiness';
import { buildTravelGuestJourney, buildTravelHubSpotlight } from '../lib/travelGuestPortal';
import {
  buildPublicAccessArtifacts,
  buildGuestIdentityArtifacts,
  captureGuestInviteTokenFromSearch,
  capturePublicInviteTokenFromSearch,
} from '../lib/publicAccessArtifacts';
import { fetchPublicSiteAccess } from '../lib/publicSiteAccess';
import {
  fetchGuestHubConfig,
  hasGuestHubPublicRuntime,
  submitGuestHubProspect,
  trackGuestHubEvent,
} from './guestHubPublicService';
import { EventHubLiveContent } from './EventHubLiveContent';
import { EventHubRouteView } from './EventHubRouteView';
import { createAlexJordanDemoWeddingData } from './siteViewHelpers';

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

type HubWeddingTravelContext = {
  schedule: Array<{ id?: string | null; label?: string | null; startTimeISO?: string | null; venueId?: string | null; notes?: string | null }>;
  venues: Array<{ id?: string | null; name?: string | null; address?: string | null }>;
};

type HubConfigStatus = 'loading' | 'ready' | 'fallback' | 'offline';

const normalizeSiteRef = (value?: string) => (value ?? '').trim().toLowerCase();
export const buildGuestHubAccessPayload = (slug: string, searchParams: URLSearchParams) => buildPublicAccessArtifacts(slug, searchParams);
export const buildGuestHubIdentityPayload = (slug: string, searchParams: URLSearchParams) => buildGuestIdentityArtifacts(slug, searchParams);

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

function buildDemoSiteSummary(slug: string, wedding = createAlexJordanDemoWeddingData()): HubSiteSummary {
  return {
    slug,
    coupleName1: wedding.couple.partner1Name?.trim() || null,
    coupleName2: wedding.couple.partner2Name?.trim() || null,
    weddingDate: typeof wedding.event.weddingDateISO === 'string' ? wedding.event.weddingDateISO.slice(0, 10) : null,
  };
}

function buildSiteSummaryFromPublicAccess(slug: string, access: Awaited<ReturnType<typeof fetchPublicSiteAccess>>): HubSiteSummary | null {
  const site = access.site;
  if (!site) return null;
  const wedding = site.render_model.wedding;
  return {
    slug: typeof site.site_slug === 'string' && site.site_slug.trim() ? site.site_slug : slug,
    coupleName1: site.couple_name_1?.trim() || wedding?.couple?.partner1Name?.trim() || null,
    coupleName2: site.couple_name_2?.trim() || wedding?.couple?.partner2Name?.trim() || null,
    weddingDate: site.wedding_date?.trim() || wedding?.event?.weddingDateISO?.slice(0, 10) || null,
  };
}

function mergeHubSiteSummary(current: HubSiteSummary | null, next: HubSiteSummary | null): HubSiteSummary | null {
  if (!next) return current;
  if (!current) return next;
  return {
    slug: current.slug || next.slug,
    coupleName1: current.coupleName1?.trim() || next.coupleName1?.trim() || null,
    coupleName2: current.coupleName2?.trim() || next.coupleName2?.trim() || null,
    weddingDate: current.weddingDate?.trim() || next.weddingDate?.trim() || null,
  };
}

export const friendlyGuestHubError = (err: unknown, fallback: string) => {
  return customerSafeErrorMessage(err, fallback, {
    allow: [/^Add an email or phone first\.$/i],
  });
};

export const safeGuestHubFunctionError = (value: unknown, fallback: string) => {
  return friendlyGuestHubError(typeof value === 'string' ? value : '', fallback);
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
  contact: ClipboardList,
  schedule: CalendarDays,
  travel: Plane,
  registry: Gift,
  photos: Camera,
  guestbook: HeartHandshake,
  vault: Archive,
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
  const [travelSource, setTravelSource] = useState<unknown>(null);
  const [travelContext, setTravelContext] = useState<HubWeddingTravelContext>({ schedule: [], venues: [] });
  const [travelShareStatus, setTravelShareStatus] = useState<string | null>(null);
  const guestIdentity = useMemo(() => buildGuestHubIdentityPayload(slug, searchParams), [searchParams, slug]);
  const languagePreference = useMemo(() => resolveGuestLanguagePreference({
    search: searchParams,
    storedLanguage: readStoredGuestLanguage(),
    siteDefaultLanguage: settings.language_default,
  }), [searchParams, settings.language_default]);
  const guestContactHref = useMemo(() => {
    if (!slug || !guestIdentity.guestInviteToken) return null;
    return `/guest-contact/${encodeURIComponent(slug)}`;
  }, [guestIdentity.guestInviteToken, slug]);

  const actions = useMemo<HubAction[]>(() => buildGuestHubActions(slug, settings, {
    guestContactHref,
    guestInviteToken: guestIdentity.guestInviteToken,
    guestLanguage: languagePreference.language,
  }).map((action) => ({
    id: action.id,
    title: t(action.titleKey),
    description: t(action.detailKey),
    href: action.href,
    icon: actionIcons[action.id],
    primary: action.primary,
  })), [guestContactHref, guestIdentity.guestInviteToken, languagePreference.language, settings, slug, t]);

  useEffect(() => {
    if (!slug) return;
    capturePublicInviteTokenFromSearch(slug, searchParams);
    captureGuestInviteTokenFromSearch(slug, searchParams);
    if (searchParams.has('hubQaConfigFallback')) {
      setHubConfigStatus('fallback');
      return;
    }
    if (!hasGuestHubPublicRuntime()) {
      if (slug === 'alex-jordan-demo') {
        const demoWedding = createAlexJordanDemoWeddingData();
        setSiteSummary(buildDemoSiteSummary(slug, demoWedding));
        setTravelSource(demoWedding.travel);
        setTravelContext({
          schedule: demoWedding.schedule,
          venues: demoWedding.venues,
        });
      }
      setHubConfigStatus('ready');
      return;
    }
    let cancelled = false;
    setHubConfigStatus(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'loading');
    const accessPayload = buildGuestHubAccessPayload(slug, searchParams);
    fetchGuestHubConfig<{
      settings?: Partial<HubSettings>;
      site?: { slug?: string; coupleName1?: string; coupleName2?: string; weddingDate?: string };
    }>(slug, buildGuestHubAccessHeaders(slug, searchParams))
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
    fetchPublicSiteAccess({
      slug,
      inviteToken: accessPayload.inviteToken,
      passwordSession: accessPayload.passwordSession,
      language: i18n.language?.split('-')[0] || 'en',
    })
      .then((access) => {
        if (!cancelled) {
          setSiteSummary((current) => mergeHubSiteSummary(current, buildSiteSummaryFromPublicAccess(slug, access)));
          setTravelSource(access.site?.render_model.wedding?.travel ?? null);
          setTravelContext({
            schedule: access.site?.render_model.wedding?.schedule ?? [],
            venues: access.site?.render_model.wedding?.venues ?? [],
          });
        }
      })
      .catch(() => {
        if (!cancelled && slug === 'alex-jordan-demo') {
          const demoWedding = createAlexJordanDemoWeddingData();
          setSiteSummary((current) => mergeHubSiteSummary(current, buildDemoSiteSummary(slug, demoWedding)));
          setTravelSource(demoWedding.travel);
          setTravelContext({
            schedule: demoWedding.schedule,
            venues: demoWedding.venues,
          });
        }
      });
    trackGuestHubEvent(slug, 'view', '/event', buildGuestHubAccessPayload(slug, searchParams)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [hubConfigRetryKey, i18n, searchParams, slug]);

  const trackClick = (target: string) => {
    if (!slug) return;
    trackGuestHubEvent(slug, 'click', target, buildGuestHubAccessPayload(slug, new URLSearchParams(window.location.search))).catch(() => {});
  };

  const submitOptIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!slug || !hasGuestHubPublicRuntime() || savingOptIn) return;
    const contact = guestContact.trim();
    if (!contact) {
      setOptInStatus(t('guest_hub.need_contact'));
      return;
    }
    setSavingOptIn(true);
      setOptInStatus(null);
    const isEmail = contact.includes('@');
    try {
      await submitGuestHubProspect(
        {
          siteSlug: slug,
          guestName,
          email: isEmail ? contact : '',
          phone: isEmail ? '' : contact,
          wantsPhotoUpdates: true,
          wantsOwnEventInfo,
          source: 'guest_hub',
          ...buildGuestHubAccessPayload(slug, searchParams),
        },
        t('guest_hub.could_not_save'),
      );
      setOptInStatus(t('guest_hub.saved_recap'));
      setGuestContact('');
    } catch (err) {
      setOptInStatus(friendlyGuestHubError(err, t('guest_hub.could_not_save')));
    } finally {
      setSavingOptIn(false);
    }
  };

  const missingSlugView = (
    <div className="min-h-screen bg-neutral-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-xl rounded-lg border border-white/10 bg-white/10 p-6">
        <h1 className="text-3xl font-semibold">{t('guest_hub.missing_title')}</h1>
        <p className="mt-3 text-white/75">{t('guest_hub.missing_subtitle')}</p>
      </div>
    </div>
  );

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
    guestInviteToken: guestIdentity.guestInviteToken,
    guestLanguage: languagePreference.language,
  });
  const travelHubSpotlight = buildTravelHubSpotlight({
    siteSlug: slug,
    travel: travelSource,
    schedule: travelContext.schedule,
    venues: travelContext.venues,
    enabledActionIds: actions.map((action) => action.id),
    guestInviteToken: guestIdentity.guestInviteToken,
    guestLanguage: languagePreference.language,
    coupleLabel,
    weddingDateLabel,
  });

  const handleCopyTravelPlan = async () => {
    if (!travelHubSpotlight) return;
    const result = await copyTextOrDownload(travelHubSpotlight.shareText, 'dayof-travel-plan.txt');
    setTravelShareStatus(result === 'copied' ? 'Travel plan copied.' : 'Travel plan downloaded.');
  };

  const handleDownloadTravelGuide = () => {
    if (!travelHubSpotlight) return;
    downloadTextFile(travelHubSpotlight.filename, travelHubSpotlight.htmlDocument, 'text/html;charset=utf-8');
    setTravelShareStatus('Travel guide saved.');
  };

  const liveContent = (
    <EventHubLiveContent
      t={t}
      coupleLabel={coupleLabel}
      weddingDateLabel={weddingDateLabel}
      customMessage={settings.custom_message}
      actionSummary={actionSummary}
      hubConfigStatus={hubConfigStatus}
      onRetryConfig={() => setHubConfigRetryKey((value) => value + 1)}
      actions={actions}
      onTrackClick={trackClick}
      travelGuestJourney={travelGuestJourney}
      travelHubSpotlight={travelHubSpotlight}
      travelShareStatus={travelShareStatus}
      onCopyTravelPlan={handleCopyTravelPlan}
      onDownloadTravelGuide={handleDownloadTravelGuide}
      hubUrl={hubUrl}
      searchParams={searchParams}
      shouldOpenHubDetailsByDefault={shouldOpenHubDetailsByDefault}
      dayOfHubStatusBoard={dayOfHubStatusBoard}
      dayOfModeReadiness={dayOfModeReadiness}
      guestName={guestName}
      guestContact={guestContact}
      wantsOwnEventInfo={wantsOwnEventInfo}
      savingOptIn={savingOptIn}
      optInStatus={optInStatus}
      onGuestNameChange={setGuestName}
      onGuestContactChange={setGuestContact}
      onToggleOwnEventInfo={setWantsOwnEventInfo}
      onSubmitOptIn={submitOptIn}
    />
  );

  return (
    <EventHubRouteView
      hasSlug={Boolean(slug)}
      liveContent={liveContent}
      missingSlugView={missingSlugView}
    />
  );
};

export default EventHub;
