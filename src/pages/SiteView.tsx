import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { WeddingDataV1, createEmptyWeddingData, normalizeWeddingData } from '../types/weddingData';
import { applyThemePreset, applyThemeTokens } from '../lib/themePresets';
import { BuilderSectionInstance, createDefaultSectionInstance } from '../types/builder/section';
import { SectionRenderer } from '../builder/components/SectionRenderer';
import { SiteViewContext } from '../contexts/SiteViewContext';
import { OwnerPreviewBanner } from '../components/site/OwnerPreviewBanner';
import { normalizePublicSiteSlug, resolveWeddingSubdomainSlugFromHostname } from '../lib/publicSiteSlug';
import { getTemplatePack } from '../builder/constants/builderTemplatePacks';
import { getSectionVariants } from '../sections/sectionRegistry';
import { fetchPublicSiteAccess, requestPublicSitePasswordUnlock } from '../lib/publicSiteAccess';
import type { PublicWeddingRenderModel } from '../lib/publicSiteRenderModel';
import {
  buildPublicAccessArtifacts,
  capturePublicInviteTokenFromSearch,
  clearStoredPublicInviteToken,
  clearStoredPublicPasswordSession,
  writeStoredPublicPasswordSession,
} from '../lib/publicAccessArtifacts';
import { hasStoredGuestLanguagePreference } from '../lib/guestLanguagePreference';
import { fetchPublicItineraryRows, hasLiveRegistryItems } from './siteViewService';
import { combineDateAndTime, createAlexJordanDemoWeddingData, toIsoDateOrUndefined } from './siteViewHelpers';
import { SiteViewRouteView } from './SiteViewRouteView';
import type { PublicSectionDTO } from '../lib/publicRenderContract';

type GuestRenderableSection = Pick<BuilderSectionInstance, 'id' | 'type' | 'variant' | 'enabled' | 'orderIndex' | 'settings' | 'bindings' | 'styleOverrides'> | PublicSectionDTO;

async function hydrateWeddingDataFromItinerary(
  siteSlug: string,
  base: WeddingDataV1,
  access: { inviteToken?: string | null; passwordSession?: string | null } = {},
): Promise<WeddingDataV1> {
  try {
    const rows = (await fetchPublicItineraryRows(siteSlug, access)).filter((row) => row.is_visible !== false);
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

function normalizeSectionVariants(sections: GuestRenderableSection[]): GuestRenderableSection[] {
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

function hasRegistryBuilderSection(sections: GuestRenderableSection[]): boolean {
  return sections.some((section) => section.type.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') === 'registry');
}

function appendRegistrySectionWhenNeeded(sections: GuestRenderableSection[], shouldAppend: boolean): GuestRenderableSection[] {
  if (!shouldAppend || hasRegistryBuilderSection(sections)) return sections;
  return [
    ...sections,
    {
      ...createDefaultSectionInstance('registry', 'featured', sections.length),
      enabled: true,
      settings: {
        title: 'Registry',
        showTitle: true,
      },
    },
  ];
}

function hasMeaningfulText(value: unknown, minLength = 2): boolean {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  if (normalized.length < minLength) return false;
  return !['tbd', 'date tbd', 'venue tbd', 'the couple', 'our wedding'].includes(normalized);
}

function hasGuestReadyVenue(data: WeddingDataV1): boolean {
  return data.venues.some((venue) => hasMeaningfulText(venue.name) || hasMeaningfulText(venue.address, 6));
}

function hasGuestReadyTravel(data: WeddingDataV1): boolean {
  const travel = data.travel ?? {};
  return [
    travel.notes,
    travel.parkingInfo,
    travel.hotelInfo,
    travel.flightInfo,
    typeof travel.accommodations === 'string' ? travel.accommodations : '',
  ].some((value) => hasMeaningfulText(value, 12)) || (Array.isArray(travel.accommodations) && travel.accommodations.length > 0);
}

function hasGuestReadyRegistry(data: WeddingDataV1): boolean {
  return Array.isArray(data.registry?.links) && data.registry.links.length > 0;
}

function settingArray(settings: Record<string, unknown> | undefined, key: string): unknown[] {
  const value = settings?.[key];
  return Array.isArray(value) ? value : [];
}

function hasSettingText(settings: Record<string, unknown> | undefined, keys: string[], minLength = 2): boolean {
  return keys.some((key) => {
    const value = settings?.[key];
    if (typeof value === 'string') return hasMeaningfulText(value, minLength);
    if (value && typeof value === 'object' && 'value' in value) {
      return hasMeaningfulText((value as { value?: unknown }).value, minLength);
    }
    return false;
  });
}

function hasGuestReadyContentForSection(
  sectionType: string,
  data: WeddingDataV1,
  settings?: Record<string, unknown>,
  variant?: string
): boolean {
  const type = sectionType.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  const normalizedVariant = variant?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') ?? '';
  switch (type) {
    case 'venue':
      return hasGuestReadyVenue(data);
    case 'schedule':
    case 'timeline':
      return data.schedule.length > 0;
    case 'registry':
      return hasGuestReadyRegistry(data);
    case 'story':
      return hasMeaningfulText(data.couple.story, 24);
    case 'gallery':
      return data.media.gallery.length > 0 || hasMeaningfulText(data.media.heroImageUrl, 10);
    case 'travel':
      return hasGuestReadyTravel(data);
    case 'accommodations':
      return hasGuestReadyTravel(data) || settingArray(settings, 'hotels').length > 0 || hasSettingText(settings, ['generalNote'], 12);
    case 'faq':
      return data.faq.length > 0;
    case 'contact':
      return normalizedVariant === 'interactivehub'
        || settingArray(settings, 'contacts').length > 0
        || hasSettingText(settings, ['introText', 'closingNote', 'subtitle'], 12);
    case 'dress-code':
    case 'dresscode':
      return hasSettingText(settings, ['presetCode', 'description', 'colorNote', 'additionalNote', 'dressCodeLabel'], 2)
        || settingArray(settings, 'suggestions').length > 0;
    case 'wedding-party':
    case 'weddingparty':
      return settingArray(settings, 'bridalParty').length > 0 || settingArray(settings, 'groomParty').length > 0;
    case 'countdown':
      return !!toIsoDateOrUndefined(data.event.weddingDateISO ?? data.event.date)
        || hasSettingText(settings, ['targetDate'], 8);
    default:
      return true;
  }
}

function filterGuestReadyBuilderSections(sections: GuestRenderableSection[], data: WeddingDataV1): GuestRenderableSection[] {
  return sections.filter((section) => hasGuestReadyContentForSection(
    section.type,
    data,
    section.settings as Record<string, unknown> | undefined,
    section.variant
  ));
}

function toBuilderSectionState(sections: GuestRenderableSection[]): BuilderSectionInstance[] {
  return sections.map((section) => ({
    id: section.id,
    type: section.type,
    variant: section.variant,
    enabled: section.enabled,
    orderIndex: section.orderIndex,
    settings: section.settings as Record<string, unknown>,
    bindings: (section.bindings ?? {}) as BuilderSectionInstance['bindings'],
    styleOverrides: (section.styleOverrides ?? {}) as BuilderSectionInstance['styleOverrides'],
    locked: false,
    meta: {
      createdAtISO: '',
      updatedAtISO: '',
    },
  }));
}

function isPublicWeddingDataSparse(data: WeddingDataV1): boolean {
  const hasCoupleNames = hasMeaningfulText(data.couple.partner1Name) || hasMeaningfulText(data.couple.partner2Name) || hasMeaningfulText(data.couple.displayName);
  const hasDate = !!toIsoDateOrUndefined(data.event.weddingDateISO ?? data.event.date);
  const hasImage = hasMeaningfulText(data.media.heroImageUrl, 10) || data.media.gallery.length > 0;
  const hasStory = hasMeaningfulText(data.couple.story, 24);
  const hasSchedule = data.schedule.length > 0;
  const score = [hasCoupleNames, hasDate, hasGuestReadyVenue(data), hasImage, hasStory, hasSchedule].filter(Boolean).length;
  return score <= 2;
}

function titleCaseSlugPart(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function deriveCoupleNamesFromSlug(siteSlug: string): { partner1Name: string; partner2Name: string; displayName: string } | null {
  const normalized = siteSlug.trim().toLowerCase();
  const match = normalized.match(/^(.+?)(?:-and-|and)(.+)$/);
  if (!match) return null;

  const partner1Name = titleCaseSlugPart(match[1] ?? '');
  const partner2Name = titleCaseSlugPart(match[2] ?? '');
  if (!hasMeaningfulText(partner1Name) || !hasMeaningfulText(partner2Name)) return null;

  return {
    partner1Name,
    partner2Name,
    displayName: `${partner1Name} and ${partner2Name}`,
  };
}

function withSlugDerivedCoupleNames(data: WeddingDataV1, siteSlug: string): WeddingDataV1 {
  const hasNames = hasMeaningfulText(data.couple.partner1Name)
    || hasMeaningfulText(data.couple.partner2Name)
    || hasMeaningfulText(data.couple.displayName);
  if (hasNames) return data;

  const derived = deriveCoupleNamesFromSlug(siteSlug);
  if (!derived) return data;

  return {
    ...data,
    couple: {
      ...data.couple,
      partner1Name: derived.partner1Name,
      partner2Name: derived.partner2Name,
      displayName: derived.displayName,
    },
  };
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
    <circle cx='315' cy='182' r='180' fill='#ffffff' opacity='0.32'/>
    <circle cx='906' cy='498' r='240' fill='#d6d3d1' opacity='0.28'/>
  </svg>`
)}`;

type PrivacyGateState = 'loading' | 'open' | 'password_required' | 'invite_only' | 'unlocked';

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
    <div className="min-h-screen flex flex-col bg-[#fbf7f1] px-4">
      <div className="flex justify-end p-4">
        <LanguageSwitcher />
      </div>
      <div className="flex-1 flex items-center justify-center">
      <div className="max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-white rounded-lg border border-stone-200 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-stone-600" />
          </div>
          <h1 className="text-2xl font-light text-stone-800 mb-2">{t('site.password_gate_title')}</h1>
          <p className="text-stone-500 text-sm">{t('site.password_gate_subtitle')}</p>
        </div>
        <form
          onSubmit={e => { e.preventDefault(); onSubmit(pw); }}
          className="bg-white border border-stone-200 rounded-lg p-5 space-y-4"
        >
          {error && (
            <div className="flex items-center gap-2 p-3 bg-stone-50 border border-stone-200 rounded-lg text-stone-700 text-sm">
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
        <p className="text-center text-xs text-stone-400 mt-2.5">Powered by dayof</p>
      </div>
      </div>
    </div>
  );
};

const InviteOnlyGate: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col bg-[#fbf7f1] px-4">
      <div className="flex justify-end p-3.5">
        <LanguageSwitcher />
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-3">
          <div className="w-16 h-16 bg-white rounded-lg border border-stone-200 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-stone-600" />
          </div>
          <div>
            <h1 className="text-2xl font-light text-stone-800 mb-2">{t('site.invite_only_title')}</h1>
            <p className="text-stone-500 leading-relaxed">{t('site.invite_only_subtitle')}</p>
          </div>
          <p className="text-sm text-stone-500">
            If you received an invitation, check your email for the private link from the couple.
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fbf7f1] px-4">
      <div className="flex justify-end w-full max-w-md absolute top-3.5 right-4">
        <LanguageSwitcher />
      </div>
      <div className="max-w-md w-full text-center space-y-3">
        <div className="w-16 h-16 bg-white rounded-lg border border-border-subtle flex items-center justify-center mx-auto">
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
          {' '}and publish from the site editor.
        </p>
      </div>
    </div>
  );
};

export const SiteView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const resolvedSlug = React.useMemo(() => {
    if (slug) return normalizePublicSiteSlug(slug);
    return resolveWeddingSubdomainSlugFromHostname(window.location.hostname);
  }, [slug]);
  const [searchParams] = useSearchParams();
  const { i18n } = useTranslation();
  const [weddingData, setWeddingData] = useState<WeddingDataV1 | null>(null);
  const [builderSections, setBuilderSections] = useState<BuilderSectionInstance[] | null>(null);
  const [weddingSiteId, setWeddingSiteId] = useState<string | null>(null);
  const [isComingSoon, setIsComingSoon] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [privacyGate, setPrivacyGate] = useState<PrivacyGateState>('loading');
  const [hideFromSearch, setHideFromSearch] = useState(false);
  const [publicSubresourceAccess, setPublicSubresourceAccess] = useState<{ inviteToken?: string | null; passwordSession?: string | null }>({});
  const [passwordGateError, setPasswordGateError] = useState<string | null>(null);
  const [passwordGateChecking, setPasswordGateChecking] = useState(false);
  const [privacyUnlockNonce, setPrivacyUnlockNonce] = useState(0);

  const handleImageErrorCapture = useCallback((event: React.SyntheticEvent<HTMLElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) return;

    if (target.dataset.fallbackApplied === '1') {
      target.style.visibility = 'hidden';
      return;
    }

    target.dataset.fallbackApplied = '1';
    target.src = FALLBACK_IMAGE_DATA_URI;
    target.alt = target.alt || '';
  }, []);

  const handlePasswordSubmit = async (pw: string) => {
    setPasswordGateChecking(true);
    setPasswordGateError(null);
    try {
      if (!resolvedSlug) {
        setPasswordGateError('This site link is not complete right now.');
        return;
      }

      const result = await requestPublicSitePasswordUnlock({
        slug: resolvedSlug,
        password: pw,
      });

      if (result.ok && result.passwordSession) {
        writeStoredPublicPasswordSession(resolvedSlug, result.passwordSession);
        setPrivacyGate('loading');
        setPrivacyUnlockNonce((current) => current + 1);
      } else {
        setPasswordGateError('Incorrect password. Please try again.');
      }
    } catch {
      setPasswordGateError('Couldn’t check that password right now. Please try again.');
    } finally {
      setPasswordGateChecking(false);
    }
  };

  useEffect(() => {
    const loadSite = async () => {
      const clearSiteState = () => {
        setWeddingSiteId(null);
        setWeddingData(null);
        setBuilderSections(null);
        setHideFromSearch(false);
        setPublicSubresourceAccess({});
      };

      setPrivacyGate('loading');
      setPasswordGateError('');
      setIsComingSoon(false);
      setError(null);
      clearSiteState();

      if (!resolvedSlug) {
        setError('This wedding site link does not look complete.');
        setLoading(false);
        return;
      }

      try {
        const urlToken = searchParams.get('token');
        const { inviteToken, passwordSession } = buildPublicAccessArtifacts(resolvedSlug, searchParams);
        const subresourceAccess = { inviteToken, passwordSession };
        const access = await fetchPublicSiteAccess({
          slug: resolvedSlug,
          inviteToken,
          passwordSession,
          language: i18n.language?.split('-')[0] || 'en',
        });

        if (access.status === 'coming_soon') {
          setIsComingSoon(true);
          setLoading(false);
          return;
        }

        if (access.status === 'password_required') {
          clearStoredPublicPasswordSession(resolvedSlug);
          setPrivacyGate('password_required');
          setLoading(false);
          return;
        }

        if (access.status === 'invite_required') {
          if (!urlToken) clearStoredPublicInviteToken(resolvedSlug);
          setPrivacyGate('invite_only');
          setLoading(false);
          return;
        }

        if (access.status === 'unavailable' || !access.site) {
          setError('This wedding site is not available right now.');
          setLoading(false);
          return;
        }

        if (urlToken) capturePublicInviteTokenFromSearch(resolvedSlug, searchParams);
        setPublicSubresourceAccess(subresourceAccess);

        const data = access.site;
        setWeddingSiteId(data.id as string);

        const siteLang = (data.default_language as string) ?? 'en';
        if (!hasStoredGuestLanguagePreference() && (siteLang === 'en' || siteLang === 'es')) {
          i18n.changeLanguage(siteLang);
        }

        const hideSearch = data.allow_search_indexing === false;

        setHideFromSearch(hideSearch);

        setPrivacyGate('open');

        const renderModel = data.render_model;
        const renderPages = (renderModel.pages ?? []).map((page) => ({
          ...page,
          sections: (page.sections ?? []).map((section) =>
            section.type === 'hero' && section.variant === 'video'
              ? { ...section, variant: 'default' }
              : section
          ),
        }));
        const isDemoSite = resolvedSlug === 'alex-jordan-demo';

        if (renderPages.length > 0) {
          const homePage = renderPages.find((page) => page.meta?.isHome || page.id === 'home' || page.slug === 'home') ?? renderPages[0];
          const sections = normalizeSectionVariants(homePage.sections.filter(s => s.enabled));
          const shouldAppendRegistry = await hasLiveRegistryItems(data.id as string, subresourceAccess);
          const publicSections = appendRegistrySectionWhenNeeded(sections, shouldAppendRegistry);
          const rawWData = normalizeWeddingData(
            (renderModel.wedding as PublicWeddingRenderModel | WeddingDataV1 | null) ?? createEmptyWeddingData(),
          );
          const wData = withSlugDerivedCoupleNames(await hydrateWeddingDataFromItinerary(resolvedSlug, rawWData, subresourceAccess), resolvedSlug);
          const sparsePublicData = isPublicWeddingDataSparse(wData);

          if (publicSections.length === 0 || (isDemoSite && sparsePublicData)) {
            if (isDemoSite) {
              const demoData = createAlexJordanDemoWeddingData();
              const demoSections = createDemoFallbackSections(data.template_id || 'modern-luxe');
              if (demoSections.length > 0) {
                setBuilderSections(toBuilderSectionState(filterGuestReadyBuilderSections(demoSections, demoData)));
                setWeddingData(demoData);
                if (renderModel.theme.preset) {
                  applyThemePreset(renderModel.theme.preset);
                } else {
                  applyThemePreset('elegant');
                }
                return;
              }
            }

            setIsComingSoon(true);
            return;
          }

          if (!isDemoSite && sparsePublicData) {
            setIsComingSoon(true);
            return;
          }

          if (renderModel.theme.tokens) {
            applyThemeTokens(renderModel.theme.tokens as unknown as Parameters<typeof applyThemeTokens>[0]);
          } else if (renderModel.theme.preset) {
            applyThemePreset(renderModel.theme.preset);
          } else if (wData.theme?.preset) {
            applyThemePreset(wData.theme.preset);
          }

          setBuilderSections(toBuilderSectionState(filterGuestReadyBuilderSections(publicSections, wData)));
          setWeddingData(wData);
        } else {
          const rawWData = renderModel.wedding
            ? normalizeWeddingData(renderModel.wedding as PublicWeddingRenderModel | WeddingDataV1)
            : null;

          if (!rawWData) {
            setError('This wedding site is still being set up. Check back soon!');
            setLoading(false);
            return;
          }

          const wData = withSlugDerivedCoupleNames(await hydrateWeddingDataFromItinerary(resolvedSlug, rawWData, subresourceAccess), resolvedSlug);
          if (isDemoSite && isPublicWeddingDataSparse(wData)) {
            const demoData = createAlexJordanDemoWeddingData();
            const demoSections = createDemoFallbackSections('modern-luxe');
            if (demoSections.length > 0) {
              setBuilderSections(toBuilderSectionState(filterGuestReadyBuilderSections(demoSections, demoData)));
              setWeddingData(demoData);
              applyThemePreset('elegant');
              return;
            }
          }
          if (!isDemoSite && isPublicWeddingDataSparse(wData)) {
            setIsComingSoon(true);
            return;
          }

          if (wData.theme?.preset) {
            applyThemePreset(wData.theme.preset);
          }

          setWeddingData(wData);
          setBuilderSections(null);
        }
      } catch {
        clearSiteState();
        setError('Couldn’t load this wedding site. Please refresh and try again.');
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
  }, [i18n, i18n.language, resolvedSlug, searchParams, privacyUnlockNonce]);

  useEffect(() => {
    if (!hideFromSearch) return;
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    meta.id = 'dayof-noindex';
    document.head.appendChild(meta);
    return () => { document.getElementById('dayof-noindex')?.remove(); };
  }, [hideFromSearch]);

  const passwordGate = (
    <PasswordGate
      onSubmit={handlePasswordSubmit}
      error={passwordGateError}
      checking={passwordGateChecking}
    />
  );
  const fallback = (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-surface border border-border-subtle rounded-lg p-6 text-center">
        <p className="text-text-secondary">This wedding site is not ready to view yet.</p>
      </div>
    </div>
  );

  let liveContent: React.ReactNode = fallback;
  let ready = false;

  if (builderSections && builderSections.length > 0 && weddingData) {
    ready = true;
    liveContent = (
      <SiteViewContext.Provider value={{ weddingSiteId, ...publicSubresourceAccess }}>
        <div className="builder-themed-canvas min-h-screen bg-background" onErrorCapture={handleImageErrorCapture}>
          <OwnerPreviewBanner />
          {builderSections.map(section => (
            <SectionRenderer key={section.id} section={section} weddingData={weddingData} surface="public" />
          ))}
        </div>
      </SiteViewContext.Provider>
    );
  }

  return (
    <SiteViewRouteView
      comingSoon={<ComingSoonScreen />}
      error={error}
      fallback={fallback}
      inviteOnlyGate={<InviteOnlyGate />}
      liveContent={liveContent}
      loading={loading}
      passwordGate={passwordGate}
      privacyGate={privacyGate}
      ready={ready}
      useComingSoon={isComingSoon}
    />
  );
};
