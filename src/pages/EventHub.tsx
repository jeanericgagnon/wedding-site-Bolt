import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { Archive, Bell, CalendarDays, Camera, ClipboardList, Gift, HeartHandshake, Plane, Sparkles } from 'lucide-react';
import { copyTextOrDownload, downloadTextFile } from '../lib/copyText';
import { buildDayOfHubStatusBoard, buildDayOfWebModeReadiness, type DayOfWebActionId } from '../lib/dayOfWebModeReadiness';
import { buildGuestHubAnnouncementCard, buildGuestHubCoordinatorHandoffCard, buildGuestHubGuestStateCard, buildGuestHubLinkAccessCard } from '../lib/dayOfGuestHubStatus';
import { buildGuestHubActions, type GuestHubActionId } from '../lib/guestHubActions';
import { readStoredGuestLanguage, resolveGuestLanguagePreference, writeStoredGuestLanguage } from '../lib/guestLanguagePreference';
import { readGuestHubOfflineSnapshot, writeGuestHubOfflineSnapshot } from '../lib/guestHubOfflineSnapshot';
import {
  buildGuestIdentityArtifacts,
  buildPublicAccessArtifacts,
  captureGuestInviteTokenFromSearch,
  capturePublicInviteTokenFromSearch,
} from '../lib/publicAccessArtifacts';
import { fetchPublicSiteAccess } from '../lib/publicSiteAccess';
import { buildTravelGuestJourney, buildTravelHubSpotlight } from '../lib/travelGuestPortal';
import {
  buildGuestHubAccessHeaders,
  buildGuestHubAccessPayload,
  buildGuestHubIdentityPayload,
  formatEventHubCoupleLabel,
  friendlyGuestHubError,
  normalizeSiteRef,
  safeGuestHubFunctionError,
  shouldOpenHubDetailsByDefault,
} from './eventHubPageHelpers';
import { EventHubLiveContent } from './EventHubLiveContent';
import { EventHubRouteView } from './EventHubRouteView';
import {
  fetchGuestHubConfig,
  hasGuestHubPublicRuntime,
  submitGuestHubProspect,
  trackGuestHubEvent,
} from './guestHubPublicService';
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

type HubAnnouncement = {
  title?: string | null;
  detail?: string | null;
  status?: string | null;
  scheduledFor?: string | null;
  sentAt?: string | null;
};

type HubGuestState = {
  guestName?: string | null;
  rsvpStatus?: string | null;
  checkedInAt?: string | null;
};

type HubCoordinatorHandoff = {
  eventName?: string | null;
  handoffStatus?: string | null;
  leadName?: string | null;
  supportName?: string | null;
  note?: string | null;
  updatedAt?: string | null;
};

type HubWeddingTravelContext = {
  schedule: Array<{ id?: string | null; label?: string | null; startTimeISO?: string | null; venueId?: string | null; notes?: string | null }>;
  venues: Array<{ id?: string | null; name?: string | null; address?: string | null }>;
};

type HubConfigStatus = 'loading' | 'ready' | 'fallback' | 'offline';

function resolveGuestHubViewTarget(searchParams: URLSearchParams) {
  if (searchParams.get('entry') === 'qr') return '/event/qr';
  if (searchParams.has('invite_token') || searchParams.has('token') || searchParams.has('passwordSession')) return '/event/invite';
  return '/event';
}

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
  updates: Bell,
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

export const EventHub: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { siteRef } = useParams();
  const [routerSearchParams] = useSearchParams();
  const slug = normalizeSiteRef(siteRef);
  const searchParams = useMemo(() => new URLSearchParams(routerSearchParams), [routerSearchParams]);
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
  const [travelShareNotice, setTravelShareNotice] = useState<'copied' | 'downloaded' | null>(null);
  const [copyingTravelPlan, setCopyingTravelPlan] = useState(false);
  const travelCopyRequestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const [announcement, setAnnouncement] = useState<HubAnnouncement | null>(null);
  const [guestState, setGuestState] = useState<HubGuestState | null>(null);
  const [coordinatorHandoff, setCoordinatorHandoff] = useState<HubCoordinatorHandoff | null>(null);
  const [hasOfflineSnapshot, setHasOfflineSnapshot] = useState(false);
  const [hasServiceWorkerShell, setHasServiceWorkerShell] = useState(false);
  const guestIdentity = useMemo(() => buildGuestHubIdentityPayload(slug, searchParams), [searchParams, slug]);
  const languagePreference = useMemo(() => resolveGuestLanguagePreference({
    search: searchParams,
    storedLanguage: readStoredGuestLanguage(slug),
    siteDefaultLanguage: settings.language_default,
  }), [searchParams, settings.language_default, slug]);
  const accessPayload = useMemo(() => buildGuestHubAccessPayload(slug, searchParams), [searchParams, slug]);
  const guestContactHref = useMemo(() => {
    if (!slug || !guestIdentity.guestInviteToken) return null;
    return `/guest-contact/${encodeURIComponent(slug)}`;
  }, [guestIdentity.guestInviteToken, slug]);
  const announcementCard = buildGuestHubAnnouncementCard(announcement);
  const guestStateCard = buildGuestHubGuestStateCard(guestState);
  const coordinatorHandoffCard = buildGuestHubCoordinatorHandoffCard(coordinatorHandoff);
  const linkAccessBaseCard = buildGuestHubLinkAccessCard({
    hasGuestInviteToken: Boolean(guestIdentity.guestInviteToken),
    hasInviteToken: Boolean(accessPayload.inviteToken),
    hasPasswordSession: Boolean(accessPayload.passwordSession),
    guestName: guestState?.guestName,
  });
  const dayOfUpdatesHref = useMemo(() => {
    if (!slug) return null;
    if (!announcementCard && !guestStateCard && !coordinatorHandoffCard && !linkAccessBaseCard) return null;
    return `/event/${encodeURIComponent(slug)}#day-of-updates`;
  }, [announcementCard, coordinatorHandoffCard, guestStateCard, linkAccessBaseCard, slug]);

  useEffect(() => () => {
    mountedRef.current = false;
    travelCopyRequestIdRef.current += 1;
  }, []);

  const actions = useMemo<HubAction[]>(() => buildGuestHubActions(slug, settings, {
    guestContactHref,
    guestInviteToken: guestIdentity.guestInviteToken,
    guestLanguage: languagePreference.language,
    dayOfUpdatesHref,
  }).map((action) => ({
    id: action.id,
    title: t(action.titleKey),
    description: t(action.detailKey),
    href: action.href,
    icon: actionIcons[action.id],
    primary: action.primary,
  })), [dayOfUpdatesHref, guestContactHref, guestIdentity.guestInviteToken, languagePreference.language, settings, slug, t]);
  const linkAccessCard = buildGuestHubLinkAccessCard({
    hasGuestInviteToken: Boolean(guestIdentity.guestInviteToken),
    hasInviteToken: Boolean(accessPayload.inviteToken),
    hasPasswordSession: Boolean(accessPayload.passwordSession),
    guestName: guestState?.guestName,
    enabledActionIds: actions.map((action) => action.id),
  });

  useEffect(() => {
    travelCopyRequestIdRef.current += 1;
    setSettings(defaultSettings);
    setSiteSummary(null);
    setGuestName('');
    setGuestContact('');
    setWantsOwnEventInfo(false);
    setSavingOptIn(false);
    setOptInStatus(null);
    setHubConfigStatus('loading');
    setTravelSource(null);
    setTravelContext({ schedule: [], venues: [] });
    setTravelShareStatus(null);
    setTravelShareNotice(null);
    setCopyingTravelPlan(false);
    setAnnouncement(null);
    setGuestState(null);
    setCoordinatorHandoff(null);
    setHasOfflineSnapshot(false);
  }, [searchParams, slug]);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setHasServiceWorkerShell('serviceWorker' in navigator);
  }, []);

  useEffect(() => {
    if (!slug) return;
    const snapshot = readGuestHubOfflineSnapshot(slug);
    setHasOfflineSnapshot(Boolean(snapshot));
    if (!snapshot) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setSettings(snapshot.settings);
      setSiteSummary(snapshot.siteSummary);
      setAnnouncement(snapshot.announcement);
      setGuestState(snapshot.guestState);
      setCoordinatorHandoff(snapshot.coordinatorHandoff);
      setTravelContext(snapshot.travelContext);
      setHubConfigStatus('offline');
    }
  }, [searchParams, slug]);

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
        setAnnouncement({
          title: 'Day-of update',
          detail: 'Ceremony doors open at 3:30 PM. The shuttle leaves the hotel at 3:00 PM.',
          status: 'sent',
          sentAt: new Date().toISOString(),
        });
        setCoordinatorHandoff({
          eventName: 'Ceremony',
          handoffStatus: 'staffed',
          leadName: 'Morgan',
          supportName: 'Avery',
          note: 'Ask the hotel desk for the latest shuttle boarding lane if weather shifts.',
          updatedAt: new Date().toISOString(),
        });
        setGuestState(guestIdentity.guestInviteToken ? {
          guestName: 'Alex Rivera',
          rsvpStatus: 'confirmed',
          checkedInAt: null,
        } : null);
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
      announcement?: HubAnnouncement | null;
      guestState?: HubGuestState | null;
      coordinatorHandoff?: HubCoordinatorHandoff | null;
    }>(slug, buildGuestHubAccessHeaders(slug, searchParams))
      .then((data) => {
        if (!cancelled && data?.settings) {
          const nextSettings = { ...defaultSettings, ...data.settings };
          setSettings(nextSettings);
          const nextSiteSummary = data.site ? {
            slug: typeof data.site.slug === 'string' ? data.site.slug : slug,
            coupleName1: typeof data.site.coupleName1 === 'string' ? data.site.coupleName1 : null,
            coupleName2: typeof data.site.coupleName2 === 'string' ? data.site.coupleName2 : null,
            weddingDate: typeof data.site.weddingDate === 'string' ? data.site.weddingDate : null,
          } : null;
          if (data.site) {
            setSiteSummary(nextSiteSummary);
          }
          setAnnouncement(data.announcement ?? null);
          setGuestState(data.guestState ?? null);
          setCoordinatorHandoff(data.coordinatorHandoff ?? null);
          writeGuestHubOfflineSnapshot(slug, {
            settings: nextSettings,
            siteSummary: nextSiteSummary,
            announcement: data.announcement ?? null,
            guestState: data.guestState ?? null,
            coordinatorHandoff: data.coordinatorHandoff ?? null,
            linkAccess: buildGuestHubLinkAccessCard({
              hasGuestInviteToken: Boolean(guestIdentity.guestInviteToken),
              hasInviteToken: Boolean(accessPayload.inviteToken),
              hasPasswordSession: Boolean(accessPayload.passwordSession),
              guestName: data.guestState?.guestName,
              enabledActionIds: actions.map((action) => action.id),
            }),
            travelContext,
          });
          setHasOfflineSnapshot(true);
          if (languagePreference.language !== i18n.language?.split('-')[0]?.toLowerCase()) {
            void i18n.changeLanguage(languagePreference.language);
          }
          if (languagePreference.source === 'guest-link') {
            writeStoredGuestLanguage(languagePreference.language, slug);
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
          const mergedSiteSummary = mergeHubSiteSummary(siteSummary, buildSiteSummaryFromPublicAccess(slug, access));
          const nextTravelContext = {
            schedule: access.site?.render_model.wedding?.schedule ?? [],
            venues: access.site?.render_model.wedding?.venues ?? [],
          };
          setSiteSummary((current) => mergeHubSiteSummary(current, buildSiteSummaryFromPublicAccess(slug, access)));
          setTravelSource(access.site?.render_model.wedding?.travel ?? null);
          setTravelContext(nextTravelContext);
          writeGuestHubOfflineSnapshot(slug, {
            settings,
            siteSummary: mergedSiteSummary,
            announcement,
            guestState,
            coordinatorHandoff,
            linkAccess: buildGuestHubLinkAccessCard({
              hasGuestInviteToken: Boolean(guestIdentity.guestInviteToken),
              hasInviteToken: Boolean(accessPayload.inviteToken),
              hasPasswordSession: Boolean(accessPayload.passwordSession),
              guestName: guestState?.guestName,
              enabledActionIds: actions.map((action) => action.id),
            }),
            travelContext: nextTravelContext,
          });
          setHasOfflineSnapshot(true);
          setHubConfigStatus((current) => (current === 'offline' ? current : 'ready'));
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

    trackGuestHubEvent(slug, 'view', resolveGuestHubViewTarget(searchParams), {
      ...accessPayload,
      guestInviteToken: guestIdentity.guestInviteToken,
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [accessPayload, guestIdentity.guestInviteToken, hubConfigRetryKey, i18n, languagePreference.language, languagePreference.source, searchParams, slug]);

  const trackClick = (target: string) => {
    if (!slug) return;
    trackGuestHubEvent(slug, 'click', target, {
      ...accessPayload,
      guestInviteToken: guestIdentity.guestInviteToken,
    }).catch(() => {});
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
          ...accessPayload,
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

  const handleGuestNameChange = (value: string) => {
    setOptInStatus(null);
    setGuestName(value);
  };

  const handleGuestContactChange = (value: string) => {
    setOptInStatus(null);
    setGuestContact(value);
  };

  const handleToggleOwnEventInfo = (value: boolean) => {
    setOptInStatus(null);
    setWantsOwnEventInfo(value);
  };

  const missingSlugView = (
    <div className="min-h-screen bg-neutral-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-xl rounded-xl border border-white/10 bg-white/10 p-6">
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
    hasGuestLanguagePreference: searchParams.has('guestLang') || searchParams.has('lang') || Boolean(readStoredGuestLanguage(slug)),
    hasPoorNetworkFallback: true,
    hasOfflineSnapshot,
    hasServiceWorkerShell,
  });
  const dayOfActionIds = actions.map((action) => action.id).filter((id): id is DayOfWebActionId => (
    id === 'rsvp' || id === 'schedule' || id === 'travel' || id === 'registry' || id === 'photos' || id === 'guestbook' || id === 'recap'
  ));
  const dayOfHubStatusBoard = buildDayOfHubStatusBoard({
    enabledActionIds: dayOfActionIds,
    hasPoorNetworkFallback: true,
    announcementsConnected: Boolean(announcementCard),
    guestSpecificStateConnected: Boolean(guestStateCard),
    coordinatorHandoffConnected: Boolean(coordinatorHandoffCard),
    privateEventVisibilityConnected: Boolean(linkAccessCard),
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
  const travelCopyContextKey = JSON.stringify({
    slug,
    search: searchParams.toString(),
    shareText: travelHubSpotlight?.shareText ?? null,
    filename: travelHubSpotlight?.filename ?? null,
    href: travelHubSpotlight?.travelHref ?? null,
  });
  const travelCopyContextKeyRef = useRef(travelCopyContextKey);
  travelCopyContextKeyRef.current = travelCopyContextKey;
  const travelGuestJourney = buildTravelGuestJourney({
    siteSlug: slug,
    enabledActionIds: actions.map((action) => action.id),
    guestInviteToken: guestIdentity.guestInviteToken,
    guestLanguage: languagePreference.language,
    travelCoreCoverageRate: travelHubSpotlight?.coreTravelCoverageRate ?? null,
    travelMainGapLabel: travelHubSpotlight?.mainGapLabel ?? null,
  });

  const handleCopyTravelPlan = async () => {
    if (!travelHubSpotlight || copyingTravelPlan) return;
    const requestId = ++travelCopyRequestIdRef.current;
    const requestContextKey = travelCopyContextKeyRef.current;
    const isCurrentTravelCopy = () => (
      mountedRef.current &&
      requestId === travelCopyRequestIdRef.current &&
      requestContextKey === travelCopyContextKeyRef.current
    );
    setTravelShareNotice(null);
    setCopyingTravelPlan(true);
    try {
      const result = await copyTextOrDownload(travelHubSpotlight.shareText, 'dayof-travel-plan.txt');
      if (!isCurrentTravelCopy()) return;
      setTravelShareNotice(result);
      setTravelShareStatus(result === 'copied' ? 'Travel plan copied.' : 'Travel plan downloaded.');
    } catch {
      if (!isCurrentTravelCopy()) return;
      setTravelShareStatus('Couldn’t copy the travel plan right now.');
    } finally {
      if (isCurrentTravelCopy()) {
        setCopyingTravelPlan(false);
      }
    }
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
      travelShareNotice={travelShareNotice}
      copyingTravelPlan={copyingTravelPlan}
      onCopyTravelPlan={handleCopyTravelPlan}
      onDownloadTravelGuide={handleDownloadTravelGuide}
      hubUrl={hubUrl}
      searchParams={searchParams}
      shouldOpenHubDetailsByDefault={shouldOpenHubDetailsByDefault}
      dayOfHubStatusBoard={dayOfHubStatusBoard}
      dayOfModeReadiness={dayOfModeReadiness}
      announcementCard={announcementCard}
      guestStateCard={guestStateCard}
      coordinatorHandoffCard={coordinatorHandoffCard}
      linkAccessCard={linkAccessCard}
      guestName={guestName}
      guestContact={guestContact}
      wantsOwnEventInfo={wantsOwnEventInfo}
      savingOptIn={savingOptIn}
      optInStatus={optInStatus}
      onGuestNameChange={handleGuestNameChange}
      onGuestContactChange={handleGuestContactChange}
      onToggleOwnEventInfo={handleToggleOwnEventInfo}
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
