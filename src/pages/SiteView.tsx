/* eslint-disable react-refresh/only-export-components */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { supabase } from '../lib/supabase';
import { WeddingDataV1, createEmptyWeddingData, normalizeWeddingData } from '../types/weddingData';
import { LayoutConfigV1 } from '../types/layoutConfig';
import { getSectionComponent } from '../sections/sectionRegistry';
import { applyThemePreset, applyThemeTokens } from '../lib/themePresets';
import { BuilderSectionInstance, createDefaultSectionInstance } from '../types/builder/section';
import type { BuilderPage } from '../types/builder/project';
import { SectionRenderer } from '../builder/components/SectionRenderer';
import { PageRenderer } from '../render/PageRenderer';
import { safeJsonParse } from '../lib/jsonUtils';
import { SiteViewContext } from '../contexts/SiteViewContext';
import { siteRepository } from '../data/siteRepository';
import { normalizePublicSiteSlug } from '../lib/publicSiteSlug';
import { getTemplatePack } from '../builder/constants/builderTemplatePacks';
import { getSectionVariants } from '../sections/sectionRegistry';
import { demoWeddingSite } from '../lib/demoData';
import { rewriteSignedMediaUrlsToPublicDeep } from '../lib/mediaUrl';
import { getSiteVisibilityState } from '../lib/siteVisibilityState';
import { buildCoupleDisplayName } from '../lib/coupleDisplayName';
import { getPublicBuilderPagesFromV2Document } from '../lib/publicBuilderV2Runtime';
import { deriveWeddingDataFromBuilderV2Document, mergeWeddingDataWithBuilderV2Supplement } from '../lib/publicBuilderV2WeddingData';
import { getIsPublishedFromSiteRow, getPublicBuilderProject, getPublicBuilderV2Document, getPublicWeddingData } from '../lib/publicSiteProject';
import { getFirstRenderablePublicBuilderPage, getPublicBuilderActivePage, getVisiblePublicBuilderPages } from '../lib/publicPageSelection';
import { readGuestAccessTokenFromParams, readStoredGuestAccessToken, storeGuestAccessToken } from '../lib/guestAccessTokenParams';

interface PublicItineraryRow {
  id?: string;
  event_name?: string;
  title?: string;
  description?: string;
  notes?: string | null;
  event_date?: string;
  start_time?: string | null;
  end_time?: string | null;
  location_name?: string | null;
  location_address?: string | null;
  is_visible?: boolean | null;
}

export function toIsoDateOrUndefined(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined;

  const date = new Date(`${trimmed}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return undefined;

  return date.toISOString().slice(0, 10) === trimmed ? date.toISOString() : undefined;
}

export function combineDateAndTime(date?: string, time?: string | null): string | undefined {
  const safeDateIso = toIsoDateOrUndefined(date);
  if (!safeDateIso) return undefined;
  if (!time) return undefined;
  const trimmedTime = time.trim();
  if (!trimmedTime) return undefined;
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(trimmedTime)) return undefined;

  const safeDate = safeDateIso.slice(0, 10);
  const normalizedTime = trimmedTime.length === 5 ? `${trimmedTime}:00` : trimmedTime;
  const iso = `${safeDate}T${normalizedTime}`;
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? undefined : dt.toISOString();
}

async function fetchPublicItineraryRows(siteId: string, siteSlug: string): Promise<PublicItineraryRow[]> {
  const { data: fnData, error: fnError } = await supabase.functions.invoke('public-itinerary-by-slug', {
    body: { slug: siteSlug },
  });

  if (!fnError && Array.isArray(fnData?.events) && fnData.events.length > 0) {
    return fnData.events as PublicItineraryRow[];
  }

  const { data, error } = await supabase
    .from('itinerary_events')
    .select('id,event_name,description,event_date,start_time,end_time,location_name,location_address')
    .eq('wedding_site_id', siteId)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error || !Array.isArray(data)) return [];
  return data as PublicItineraryRow[];
}

async function hydrateWeddingDataFromItinerary(siteId: string, siteSlug: string, base: WeddingDataV1): Promise<WeddingDataV1> {
  try {
    const rows = (await fetchPublicItineraryRows(siteId, siteSlug)).filter((row) => row.is_visible !== false);
    if (rows.length === 0) return base;

    const derivedVenues: WeddingDataV1['venues'] = [];
    const venueIdByKey = new Map<string, string>();

    const schedule = rows.map((row, index) => {
      const locationName = row.location_name?.trim();
      const locationAddress = row.location_address?.trim();
      let venueId: string | undefined;

      if (locationName || locationAddress) {
        const key = `${locationName ?? ''}|${locationAddress ?? ''}`;
        const existing = venueIdByKey.get(key);
        if (existing) {
          venueId = existing;
        } else {
          venueId = `itinerary-venue-${index}`;
          venueIdByKey.set(key, venueId);
          derivedVenues.push({
            id: venueId,
            name: locationName || locationAddress || 'Event Location',
            address: locationAddress || undefined,
          });
        }
      }

      return {
        id: row.id || `itinerary-${index}`,
        label: row.event_name || row.title || 'Event',
        startTimeISO: combineDateAndTime(row.event_date, row.start_time),
        endTimeISO: combineDateAndTime(row.event_date, row.end_time),
        venueId,
        notes: row.description || row.notes || undefined,
      };
    });

    if (schedule.length === 0) return base;

    return {
      ...base,
      venues: [...base.venues, ...derivedVenues],
      schedule,
    };
  } catch {
    return base;
  }
}

function createDemoFallbackSections(templateId = 'modern-luxe'): BuilderSectionInstance[] {
  const template = getTemplatePack(templateId);
  if (!template) return [];

  return template.sectionComposition.map((section, index) => ({
    ...createDefaultSectionInstance(section.type, section.variant, index),
    enabled: section.enabled,
    locked: section.locked,
    settings: { ...section.settings },
  }));
}

function normalizeSectionVariants(sections: BuilderSectionInstance[]): BuilderSectionInstance[] {
  return sections.map((section) => {
    const supported = getSectionVariants(section.type);
    if (supported.includes(section.variant)) return section;

    const fallbackMap: Record<string, Record<string, string>> = {
      hero: { video: 'default' },
      countdown: { rings: 'default', photo: 'default' },
      venue: { split: 'card' },
      schedule: { minimal: 'timeline' },
      registry: {
        default: 'cards',
        grid: 'cards',
        fundHighlight: 'featured',
        honeymoon: 'featured',
        tabs: 'cards',
        illustrated: 'cards',
        minimal: 'cards',
        classic: 'cards',
        luxury: 'featured',
        experiences: 'featured',
        modern: 'cards',
        playful: 'cards',
      },
      rsvp: { form: 'default' },
      'footer-cta': { expanded: 'default' },
      story: { editorial: 'default' },
      gallery: { fullwidth: 'default' },
    };

    const nextVariant = fallbackMap[section.type]?.[section.variant] ?? supported[0] ?? 'default';
    return { ...section, variant: nextVariant };
  });
}

export function createAlexJordanDemoWeddingData(overrides: Partial<typeof demoWeddingSite> = {}): WeddingDataV1 {
  const site = { ...demoWeddingSite, ...overrides };
  const data = createEmptyWeddingData();
  data.couple.partner1Name = site.couple_name_1;
  data.couple.partner2Name = site.couple_name_2;
  data.couple.displayName = buildCoupleDisplayName(site.couple_name_1, site.couple_name_2, 'The couple');
  data.event.weddingDateISO = toIsoDateOrUndefined(site.wedding_date);
  data.venues = [{ id: 'demo-venue-1', name: site.venue_name, address: site.venue_location }];
  data.media.heroImageUrl = site.hero_image_url;
  data.theme.preset = 'elegant';
  return data;
}

const FALLBACK_IMAGE_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 675'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='#f5f5f4'/>
        <stop offset='100%' stop-color='#e7e5e4'/>
      </linearGradient>
    </defs>
    <rect width='1200' height='675' fill='url(#g)'/>
    <g fill='none' stroke='#a8a29e' stroke-width='16' opacity='0.8'>
      <rect x='420' y='212' width='360' height='250' rx='22'/>
      <path d='M452 430l90-95 84 74 58-54 68 75'/>
      <circle cx='688' cy='286' r='22' fill='#a8a29e' stroke='none'/>
    </g>
    <text x='600' y='528' text-anchor='middle' fill='#78716c' font-size='34' font-family='Inter,Arial,sans-serif'>Image unavailable</text>
  </svg>`
)}`;

const PageRendererFromDB: React.FC<{ siteId: string; siteSlug: string; weddingData?: WeddingDataV1 | null }> = ({ siteId, siteSlug, weddingData }) => {
  const [sections, setSections] = useState<import('../sections/schemas').PersistedSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    siteRepository.fetchPublishedSections(siteId)
      .then(setSections)
      .catch(() => setSections([]))
      .finally(() => setLoading(false));
  }, [siteId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-stone-200 border-t-stone-600 rounded-full animate-spin" />
      </div>
    );
  }

  return <PageRenderer sections={sections} weddingData={weddingData} siteSlug={siteSlug} />;
};

type PrivacyGateState = 'loading' | 'open' | 'password_required' | 'invite_only' | 'unlocked';

export const SITE_PASSWORD_MISMATCH_ERROR = 'That password did not match. Please try again.';
export const SITE_PASSWORD_RETRY_ERROR = 'We could not check that password right now. Please try again.';
export const SITE_INVALID_URL_ERROR = 'This wedding page link is not valid.';
export const SITE_NOT_FOUND_ERROR = 'This wedding page could not be found.';
export const SITE_SETUP_PENDING_ERROR = 'This wedding page is still being set up. Please check back soon.';
export const SITE_LOAD_RETRY_ERROR = 'We could not load this wedding page right now. Please try again.';
export const SITE_INVITE_ONLY_HELP = 'If you received an invitation, check your email for the wedding access link from the couple.';

const PasswordGate: React.FC<{
  onSubmit: (pw: string) => void;
  error: string | null;
  checking: boolean;
}> = ({ onSubmit, error, checking }) => {
  const { t } = useTranslation();
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-stone-50 to-stone-100 px-4">
      <div className="flex justify-end p-4">
        <LanguageSwitcher />
      </div>
      <div className="flex-1 flex items-center justify-center">
      <div className="max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-stone-200" />
          </div>
          <h1 className="text-2xl font-light text-stone-800 mb-2">{t('site.password_gate_title')}</h1>
          <p className="text-stone-500 text-sm">{t('site.password_gate_subtitle')}</p>
        </div>
        <form
          onSubmit={e => { e.preventDefault(); onSubmit(pw); }}
          className="bg-white border border-stone-200 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.06)] p-5 space-y-4"
        >
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <div className="relative">
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('site.password_label')}</label>
            <input
              ref={inputRef}
              type={showPw ? 'text' : 'password'}
              value={pw}
              onChange={e => setPw(e.target.value)}
              className="w-full h-11 px-3 pr-10 border border-stone-300 rounded-lg text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400"
              placeholder={t('site.password_placeholder')}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-8 text-stone-400 hover:text-stone-600"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button
            type="submit"
            disabled={!pw || checking}
            className="w-full h-11 bg-stone-800 text-white rounded-lg font-semibold hover:bg-stone-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {checking ? t('site.password_checking') : t('site.password_submit')}
          </button>
        </form>
        <p className="text-center text-xs text-stone-400 mt-2.5">Powered by DayOf</p>
      </div>
      </div>
    </div>
  );
};

const InviteOnlyGate: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-stone-50 to-stone-100 px-4">
      <div className="flex justify-end p-3.5">
        <LanguageSwitcher />
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-3">
          <div className="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-stone-200" />
          </div>
          <div>
            <h1 className="text-2xl font-light text-stone-800 mb-2">{t('site.invite_only_title')}</h1>
            <p className="text-stone-500 leading-relaxed">{t('site.invite_only_subtitle')}</p>
          </div>
          <p className="text-sm text-stone-500">
            {SITE_INVITE_ONLY_HELP}
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-stone-200" />
            <span className="text-xs text-stone-400 px-2">dayof.love</span>
            <div className="flex-1 h-px bg-stone-200" />
          </div>
        </div>
      </div>
    </div>
  );
};

const ComingSoonScreen: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-surface px-4">
      <div className="flex justify-end w-full max-w-md absolute top-3.5 right-4">
        <LanguageSwitcher />
      </div>
      <div className="max-w-md w-full text-center space-y-3">
        <div className="w-24 h-24 bg-primary/8 rounded-full flex items-center justify-center mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-primary/60">
            <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-light text-text-primary mb-2">{t('site.coming_soon_title')}</h1>
          <p className="text-text-secondary leading-relaxed">{t('site.coming_soon_subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-text-tertiary px-2">dayof.love</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <p className="text-xs text-text-tertiary">
          Are you the couple?{' '}
          <a href="/login" className="text-primary hover:underline">Sign in</a>
          {' '}and click Publish in your builder.
        </p>
      </div>
    </div>
  );
};

export const SiteView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const resolvedSlug = React.useMemo(() => {
    if (slug) return normalizePublicSiteSlug(slug);
    const host = window.location.hostname.toLowerCase();
    if (!host.endsWith('dayof.love')) return null;
    const parts = host.split('.');
    if (parts.length < 3) return null; // dayof.love
    const sub = parts[0];
    if (!sub || sub === 'www') return null;
    return normalizePublicSiteSlug(sub);
  }, [slug]);
  const [searchParams] = useSearchParams();
  const { i18n } = useTranslation();
  const [weddingData, setWeddingData] = useState<WeddingDataV1 | null>(null);
  const [builderPages, setBuilderPages] = useState<BuilderPage[] | null>(null);
  const [builderSections, setBuilderSections] = useState<BuilderSectionInstance[] | null>(null);
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfigV1 | null>(null);
  const [weddingSiteId, setWeddingSiteId] = useState<string | null>(null);
  const [useNewRenderer, setUseNewRenderer] = useState(false);
  const [isComingSoon, setIsComingSoon] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [privacyGate, setPrivacyGate] = useState<PrivacyGateState>('loading');
  const [hideFromSearch, setHideFromSearch] = useState(false);
  const [passwordGateError, setPasswordGateError] = useState<string | null>(null);
  const [passwordGateChecking, setPasswordGateChecking] = useState(false);

  const STORAGE_KEY = `dayof_pw_unlocked_${resolvedSlug ?? 'unknown'}`;

  const handleImageErrorCapture = useCallback((event: React.SyntheticEvent<HTMLElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) return;

    if (target.dataset.fallbackApplied === '1') {
      target.style.visibility = 'hidden';
      return;
    }

    target.dataset.fallbackApplied = '1';
    target.src = FALLBACK_IMAGE_DATA_URI;
    if (!target.alt || target.alt.trim().length === 0) {
      target.alt = 'Image unavailable';
    }
  }, []);

  const handlePasswordSubmit = async (pw: string) => {
    setPasswordGateChecking(true);
    setPasswordGateError(null);
    try {
      const { data } = await supabase.rpc('check_site_password', {
        p_slug: resolvedSlug,
        p_password: pw,
      });
      if (data === true) {
        sessionStorage.setItem(STORAGE_KEY, '1');
        setPrivacyGate('unlocked');
      } else {
        setPasswordGateError(SITE_PASSWORD_MISMATCH_ERROR);
      }
    } catch {
      setPasswordGateError(SITE_PASSWORD_RETRY_ERROR);
    } finally {
      setPasswordGateChecking(false);
    }
  };

  useEffect(() => {
    const loadSite = async () => {
      const clearSiteState = () => {
        setWeddingSiteId(null);
        setWeddingData(null);
        setBuilderPages(null);
        setLayoutConfig(null);
        setBuilderSections(null);
        setUseNewRenderer(false);
        setHideFromSearch(false);
      };

      setPrivacyGate('loading');
      setPasswordGateError('');
      setIsComingSoon(false);
      setError(null);
      clearSiteState();

      if (!resolvedSlug) {
        setError(SITE_INVALID_URL_ERROR);
        setLoading(false);
        return;
      }

      try {
        const data = await siteRepository.fetchPublicSiteBySlug(resolvedSlug);

        if (!data) {
          setError(SITE_NOT_FOUND_ERROR);
          setLoading(false);
          return;
        }

        setWeddingSiteId(data.id as string);

        const siteLang = (data.default_language as string) ?? 'en';
        const userPref = localStorage.getItem('dayof_language');
        if (!userPref && (siteLang === 'en' || siteLang === 'es')) {
          i18n.changeLanguage(siteLang);
        }

        const row = data as Record<string, unknown>;
        const isPublished = getIsPublishedFromSiteRow(row);

        const privacyMode = (data.privacy_mode as string) ?? 'public';
        const visibility = getSiteVisibilityState({ isPublished, privacyMode, hideFromSearch: data.hide_from_search === true });
        const allowPrivatePreview = visibility.isPrivatePreview;

        if (!isPublished && !allowPrivatePreview) {
          setIsComingSoon(true);
          setLoading(false);
          return;
        }

        const hideSearch = !!(data.hide_from_search);

        setHideFromSearch(hideSearch);

        if (privacyMode === 'password_protected') {
          const alreadyUnlocked = sessionStorage.getItem(`dayof_pw_unlocked_${resolvedSlug}`) === '1';
          if (!alreadyUnlocked) {
            setPrivacyGate('password_required');
            setLoading(false);
            return;
          }
        } else if (privacyMode === 'invite_only') {
          const urlToken = readGuestAccessTokenFromParams(searchParams);
          const storedToken = readStoredGuestAccessToken(sessionStorage, resolvedSlug);
          const tokenToCheck = urlToken || storedToken;
          const hasInviteAccess = tokenToCheck
            ? await siteRepository.verifyPublicInviteAccess(resolvedSlug, tokenToCheck)
            : false;
          if (!hasInviteAccess) {
            setPrivacyGate('invite_only');
            setLoading(false);
            return;
          }
          if (tokenToCheck) {
            storeGuestAccessToken(sessionStorage, resolvedSlug, tokenToCheck);
          }
        }

        setPrivacyGate('open');

        const rawBuilderV2Document = getPublicBuilderV2Document(row);
        const rawSiteJson = getPublicBuilderProject(row);
        const siteJsonPages = rawBuilderV2Document
          ? getPublicBuilderPagesFromV2Document(rawBuilderV2Document)
          : rawSiteJson?.pages ?? [];
        const siteJson = siteJsonPages.length > 0 || rawSiteJson
          ? rewriteSignedMediaUrlsToPublicDeep({
              ...(rawSiteJson ?? {}),
              pages: siteJsonPages.map((page) => ({
                ...page,
                sections: (page.sections ?? []).map((section) =>
                  section.type === 'hero' && section.variant === 'video'
                    ? { ...section, variant: 'default' }
                    : section
                ),
              })),
            })
          : null;

        const persistedSections = await siteRepository.fetchPublishedSections(data.id as string).catch(() => []);

        if (isPublished && persistedSections.length > 0 && !(siteJson && siteJson.pages?.length > 0)) {
          const supplementedWData = rawBuilderV2Document
            ? mergeWeddingDataWithBuilderV2Supplement(
                getPublicWeddingData(row),
                deriveWeddingDataFromBuilderV2Document(rawBuilderV2Document),
              )
            : (getPublicWeddingData(row) ?? createEmptyWeddingData());
          const rawWData = normalizeWeddingData(
            rewriteSignedMediaUrlsToPublicDeep(supplementedWData)
          );
          const wData = await hydrateWeddingDataFromItinerary(data.id as string, resolvedSlug, rawWData);
          setUseNewRenderer(true);
          setBuilderSections(null);
          setLayoutConfig(null);
          setWeddingData(wData);
          setWeddingSiteId(data.id as string);
          return;
        }

        if (siteJson && siteJson.pages?.length > 0) {
          const normalizedPages = siteJson.pages.map((page) => ({
            ...page,
            sections: normalizeSectionVariants(page.sections ?? []),
          }));
          const visiblePages = getVisiblePublicBuilderPages(normalizedPages);
          const hasVisibleSections = visiblePages.some((page) => page.sections.some((section) => section.enabled));
          const initialRenderablePage = getFirstRenderablePublicBuilderPage(visiblePages)
            ?? getPublicBuilderActivePage(visiblePages, searchParams.get('page'))
            ?? visiblePages[0]
            ?? normalizedPages[0]
            ?? null;

          if (!hasVisibleSections) {
            if (resolvedSlug === 'alex-jordan-demo') {
              const demoSections = createDemoFallbackSections(siteJson.templateId || 'modern-luxe');
              if (demoSections.length > 0) {
                setBuilderPages([
                  {
                    id: 'home',
                    title: 'Home',
                    slug: 'home',
                    orderIndex: 0,
                    sections: demoSections,
                    meta: { isHome: true, isHidden: false },
                  },
                ]);
                setBuilderSections(demoSections);
                setWeddingData(createAlexJordanDemoWeddingData());
                if (siteJson.themeId) {
                  applyThemePreset(siteJson.themeId);
                } else {
                  applyThemePreset('elegant');
                }
                return;
              }
            }

            setIsComingSoon(true);
            return;
          }

          const supplementedWData = rawBuilderV2Document
            ? mergeWeddingDataWithBuilderV2Supplement(
                getPublicWeddingData(row),
                deriveWeddingDataFromBuilderV2Document(rawBuilderV2Document),
              )
            : (getPublicWeddingData(row) ?? createEmptyWeddingData());
          const rawWData = normalizeWeddingData(
            rewriteSignedMediaUrlsToPublicDeep(supplementedWData)
          );
          const wData = await hydrateWeddingDataFromItinerary(data.id as string, resolvedSlug, rawWData);

          if (siteJson.themeTokens) {
            applyThemeTokens(siteJson.themeTokens);
          } else if (siteJson.themeId) {
            applyThemePreset(siteJson.themeId);
          } else if (wData.theme?.preset) {
            applyThemePreset(wData.theme.preset);
          }

          setBuilderPages(normalizedPages);
          setBuilderSections(normalizeSectionVariants(initialRenderablePage?.sections.filter((section) => section.enabled) ?? []));
          setWeddingData(wData);
        } else {
          const parsedWData = rawBuilderV2Document
            ? mergeWeddingDataWithBuilderV2Supplement(
                getPublicWeddingData(row),
                deriveWeddingDataFromBuilderV2Document(rawBuilderV2Document),
              )
            : getPublicWeddingData(row);
          const rawWData = parsedWData
            ? normalizeWeddingData(rewriteSignedMediaUrlsToPublicDeep(parsedWData))
            : null;
          const lConfig = safeJsonParse<LayoutConfigV1 | null>(data.layout_config, null);

          if (!rawWData || !lConfig) {
            setError(SITE_SETUP_PENDING_ERROR);
            setLoading(false);
            return;
          }

          const wData = await hydrateWeddingDataFromItinerary(data.id as string, resolvedSlug, rawWData);

          if (wData.theme?.preset) {
            applyThemePreset(wData.theme.preset);
          }

          setWeddingData(wData);
          setLayoutConfig(lConfig);
        }
      } catch {
        clearSiteState();
        setError(SITE_LOAD_RETRY_ERROR);
      } finally {
        setLoading(false);
      }
    };

    loadSite();

    return () => {
      const el = document.documentElement;
      const resetProps = [
        '--color-primary', '--color-primary-hover', '--color-primary-light',
        '--color-accent', '--color-accent-hover', '--color-accent-light',
        '--color-secondary', '--color-background', '--color-surface',
        '--color-surface-subtle', '--color-border',
        '--color-text-primary', '--color-text-secondary',
      ];
      resetProps.forEach(p => el.style.removeProperty(p));
    };
  }, [i18n, resolvedSlug, searchParams]);

  useEffect(() => {
    if (!hideFromSearch) return;
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    meta.id = 'dayof-noindex';
    document.head.appendChild(meta);
    return () => { document.getElementById('dayof-noindex')?.remove(); };
  }, [hideFromSearch]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading wedding site...</p>
        </div>
      </div>
    );
  }

  if (isComingSoon) {
    return (
      <ComingSoonScreen />
    );
  }

  if (privacyGate === 'password_required') {
    return (
      <PasswordGate
        onSubmit={handlePasswordSubmit}
        error={passwordGateError}
        checking={passwordGateChecking}
      />
    );
  }

  if (privacyGate === 'invite_only') {
    return <InviteOnlyGate />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full bg-surface border border-border-subtle rounded-xl p-6 text-center">
          <AlertCircle className="w-14 h-14 text-error mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-text-primary mb-2">Something went wrong</h1>
          <p className="text-text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  if (useNewRenderer && weddingSiteId) {
    return (
      <SiteViewContext.Provider value={{ weddingSiteId }}>
        <div onErrorCapture={handleImageErrorCapture}>
          <PageRendererFromDB siteId={weddingSiteId} siteSlug={resolvedSlug ?? ''} weddingData={weddingData} />
        </div>
      </SiteViewContext.Provider>
    );
  }

  if (builderSections && builderSections.length > 0 && weddingData) {
    const visiblePages = builderPages ? getVisiblePublicBuilderPages(builderPages) : [];
    const activeBuilderPage = visiblePages.length > 0
      ? getPublicBuilderActivePage(visiblePages, searchParams.get('page'))
      : null;
    const renderedSections = activeBuilderPage
      ? activeBuilderPage.sections.filter((section) => section.enabled)
      : builderSections;

    return (
      <SiteViewContext.Provider value={{ weddingSiteId }}>
        <div className="builder-themed-canvas min-h-screen bg-background" onErrorCapture={handleImageErrorCapture}>
          {visiblePages.length > 1 && resolvedSlug && (
            <div className="sticky top-0 z-20 border-b border-border-subtle bg-background/95 backdrop-blur">
              <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2 px-4 py-3">
                <p className="mr-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Pages</p>
                {visiblePages.map((page) => {
                  const isActive = page.id === activeBuilderPage?.id;
                  const href = page.meta.isHome
                    ? `/${resolvedSlug}`
                    : `/${resolvedSlug}?page=${encodeURIComponent(page.slug)}`;

                  return (
                    <Link
                      key={page.id}
                      to={href}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        isActive
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-border-subtle bg-white text-text-secondary hover:border-primary/30 hover:bg-primary/5 hover:text-text-primary'
                      }`}
                    >
                      {page.title}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
          {renderedSections.map(section => (
            <SectionRenderer key={section.id} section={section} weddingData={weddingData} />
          ))}
        </div>
      </SiteViewContext.Provider>
    );
  }

  if (!weddingData || !layoutConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full bg-surface border border-border-subtle rounded-xl p-6 text-center">
          <p className="text-text-secondary">No wedding site data found</p>
        </div>
      </div>
    );
  }

  const homePage = layoutConfig.pages.find(p => p.id === 'home') || layoutConfig.pages[0];
  if (!homePage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full bg-surface border border-border-subtle rounded-xl p-6 text-center">
          <p className="text-text-secondary">No page configuration found</p>
        </div>
      </div>
    );
  }

  const enabledSections = homePage.sections.filter(section => section.enabled);

  return (
    <SiteViewContext.Provider value={{ weddingSiteId }}>
      <div className="min-h-screen bg-background" onErrorCapture={handleImageErrorCapture}>
        {enabledSections.map((sectionInstance) => {
          try {
            const SectionComponent = getSectionComponent(
              sectionInstance.type,
              sectionInstance.variant
            );
            return (
              <SectionComponent
                key={sectionInstance.id}
                data={weddingData}
                instance={sectionInstance}
              />
            );
          } catch {
            return (
              <div key={sectionInstance.id} className="py-8 px-4 bg-error-light text-error text-center">
                <p>Error rendering {sectionInstance.type} section</p>
              </div>
            );
          }
        })}
      </div>
    </SiteViewContext.Provider>
  );
};
