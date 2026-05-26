import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
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
import { DEMO_MODE } from '../config/env';
import type { PublicWeddingRenderModel } from '../lib/publicSiteRenderModel';
import {
  buildPublicAccessArtifacts,
  capturePublicInviteTokenFromSearch,
  clearStoredPublicInviteToken,
  clearStoredPublicPasswordSession,
  getInviteTokenFromSearch,
  writeStoredPublicPasswordSession,
} from '../lib/publicAccessArtifacts';
import { hasStoredGuestLanguagePreference } from '../lib/guestLanguagePreference';
import { fetchPublicItineraryRows, hasLiveRegistryItems } from './siteViewService';
import { combineDateAndTime } from './siteViewHelpers';
import { SiteViewRouteView } from './SiteViewRouteView';
import type { PublicSectionDTO } from '../lib/publicRenderContract';
import { trackGuestHubEvent } from './guestHubPublicService';
import { isPublicWeddingDataSparse } from '../lib/publicSiteReadiness';
import { filterGuestReadySections, hasMeaningfulText } from '../lib/publicGuestSectionReadiness';
import { resolveSiteViewAnalyticsTarget } from './siteViewAnalyticsTarget';
import { shouldAppendPublicRsvpSection } from './siteViewSectionGuards';
import { readLocalDemoAuthFlag } from '../contexts/localDemoAuthStorage';
import { PublicSitePageNav } from './PublicSitePageNav';
import { createDemoFallbackPages, createDemoWeddingDataForSlug, deriveCoupleNamesFromPublicSlug } from './siteViewDemoFallback';
import { getPublicSectionAnchorNavItems } from './siteViewSectionAnchors';
import {
  buildPublicSitePageHref,
  getPublicSitePageNavItems,
  selectPublicSitePage,
  type PublicSitePageNavItem,
} from './siteViewPageSelection';

type GuestRenderableSection = Pick<BuilderSectionInstance, 'id' | 'type' | 'variant' | 'enabled' | 'orderIndex' | 'settings' | 'bindings' | 'styleOverrides'> | PublicSectionDTO;

function syncPublicNoIndexMeta(shouldNoIndex: boolean) {
  if (typeof document === 'undefined') return null;

  const existing = document.head.querySelector<HTMLMetaElement>('meta#dayof-noindex, meta[name="robots"][data-dayof-noindex="1"]');
  if (!shouldNoIndex) {
    existing?.remove();
    return null;
  }

  const meta = existing ?? document.createElement('meta');
  meta.name = 'robots';
  meta.content = 'noindex, nofollow';
  meta.id = 'dayof-noindex';
  meta.dataset.dayofNoindex = '1';
  if (!existing) document.head.appendChild(meta);
  return meta;
}

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

const LOCAL_DEMO_PUBLIC_ACCESS_TIMEOUT_MS = 1200;

async function withLocalDemoPublicAccessTimeout<T>(promise: Promise<T>, shouldTimeout: boolean): Promise<T> {
  if (!shouldTimeout) return promise;

  let timeoutId: number | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error('Local demo public access timed out.')), LOCAL_DEMO_PUBLIC_ACCESS_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

function shouldPreferLocalDemoPublicPreview(): boolean {
  try {
    return readLocalDemoAuthFlag();
  } catch {
    return false;
  }
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

function hasRsvpBuilderSection(sections: GuestRenderableSection[]): boolean {
  return sections.some((section) => (
    section.enabled !== false
    && section.type.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') === 'rsvp'
  ));
}

function appendRsvpSectionWhenNeeded(sections: GuestRenderableSection[], shouldAppend: boolean): GuestRenderableSection[] {
  if (!shouldAppend || hasRsvpBuilderSection(sections)) return sections;
  return [
    ...sections,
    {
      ...createDefaultSectionInstance('rsvp', 'default', sections.length),
      enabled: true,
      settings: {
        title: 'RSVP',
        showTitle: true,
      },
    },
  ];
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

function filterGuestReadyBuilderSections(sections: GuestRenderableSection[], data: WeddingDataV1): GuestRenderableSection[] {
  return filterGuestReadySections(sections.map((section) => ({
    ...section,
    settings: (section.settings as Record<string, unknown> | null | undefined) ?? {},
  })), data);
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

function withSlugDerivedCoupleNames(data: WeddingDataV1, siteSlug: string): WeddingDataV1 {
  const hasNames = hasMeaningfulText(data.couple.partner1Name)
    || hasMeaningfulText(data.couple.partner2Name)
    || hasMeaningfulText(data.couple.displayName);
  if (hasNames) return data;

  const derived = deriveCoupleNamesFromPublicSlug(siteSlug);
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
  const [dismissedCurrentError, setDismissedCurrentError] = useState(false);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setDismissedCurrentError(false); }, [error]);

  const visibleError = error && !dismissedCurrentError ? error : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf7f1] px-4">
      <div className="flex justify-end p-4">
        <LanguageSwitcher />
      </div>
      <div className="flex-1 flex items-center justify-center">
      <div className="max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-white rounded-xl border border-stone-200 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-stone-600" />
          </div>
          <h1 className="text-2xl font-light text-stone-800 mb-2">{t('site.password_gate_title')}</h1>
          <p className="text-stone-500 text-sm">{t('site.password_gate_subtitle')}</p>
        </div>
        <form
          onSubmit={e => { e.preventDefault(); onSubmit(pw); }}
          className="bg-white border border-stone-200 rounded-xl p-5 space-y-4"
        >
          {visibleError && (
            <div className="flex items-center gap-2 p-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {visibleError}
            </div>
          )}
          <div className="relative">
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('site.password_label')}</label>
            <input
              ref={inputRef}
              type={showPw ? 'text' : 'password'}
              value={pw}
              onChange={e => {
                setPw(e.target.value);
                if (error) setDismissedCurrentError(true);
              }}
              className="w-full h-11 px-3 pr-10 border border-stone-300 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400"
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
            className="w-full h-11 bg-stone-800 text-white rounded-xl font-semibold hover:bg-stone-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          <div className="w-16 h-16 bg-white rounded-xl border border-stone-200 flex items-center justify-center mx-auto">
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
        <div className="w-16 h-16 bg-white rounded-xl border border-border-subtle flex items-center justify-center mx-auto">
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
          <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          {' '}and publish from the site editor.
        </p>
      </div>
    </div>
  );
};

export const SiteView: React.FC = () => {
  const { slug, pageSlug } = useParams<{ slug: string; pageSlug?: string }>();
  const isWeddingSubdomainRoute = !slug;

  const resolvedSlug = React.useMemo(() => {
    if (slug) return normalizePublicSiteSlug(slug);
    return resolveWeddingSubdomainSlugFromHostname(window.location.hostname);
  }, [slug]);
  const [searchParams] = useSearchParams();
  const { i18n } = useTranslation();
  const [weddingData, setWeddingData] = useState<WeddingDataV1 | null>(null);
  const [builderSections, setBuilderSections] = useState<BuilderSectionInstance[] | null>(null);
  const [publicPageNavItems, setPublicPageNavItems] = useState<PublicSitePageNavItem[]>([]);
  const [weddingSiteId, setWeddingSiteId] = useState<string | null>(null);
  const [isComingSoon, setIsComingSoon] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [privacyGate, setPrivacyGate] = useState<PrivacyGateState>('loading');
  const [hideFromSearch, setHideFromSearch] = useState(false);
  const [sitePrivacyMode, setSitePrivacyMode] = useState<'public' | 'password_protected' | 'invite_only' | 'hidden'>('public');
  const [publicSubresourceAccess, setPublicSubresourceAccess] = useState<{ inviteToken?: string | null; passwordSession?: string | null }>({});
  const [passwordGateError, setPasswordGateError] = useState<string | null>(null);
  const [passwordGateChecking, setPasswordGateChecking] = useState(false);
  const [privacyUnlockNonce, setPrivacyUnlockNonce] = useState(0);
  const publicSectionAnchorNavItems = useMemo(
    () => getPublicSectionAnchorNavItems(builderSections ?? []),
    [builderSections]
  );
  const publicRsvpHref = useMemo(() => {
    if (!resolvedSlug) return null;
    const rsvpPage = publicPageNavItems.find((item) => item.slug === 'rsvp' && !item.isHome);
    return rsvpPage ? buildPublicSitePageHref(resolvedSlug, rsvpPage, isWeddingSubdomainRoute) : null;
  }, [isWeddingSubdomainRoute, publicPageNavItems, resolvedSlug]);

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
        setPublicPageNavItems([]);
        setHideFromSearch(false);
        setSitePrivacyMode('public');
        setPublicSubresourceAccess({});
      };
      const isDemoSite = resolvedSlug === 'alex-jordan-demo';
      const applyDemoFallback = (templateId?: string | null) => {
        if (!resolvedSlug) return false;
        const demoData = createDemoWeddingDataForSlug(resolvedSlug);
        const demoPages = createDemoFallbackPages(templateId || 'modern-luxe');
        const selectedDemoPage = selectPublicSitePage(demoPages, pageSlug);
        const demoSections = selectedDemoPage?.sections ?? createDemoFallbackSections(templateId || 'modern-luxe');
        if (demoSections.length === 0) return false;

        setWeddingSiteId('demo-site-id');
        setHideFromSearch(false);
        setPrivacyGate('open');
        setPublicPageNavItems(demoPages.length > 0 ? getPublicSitePageNavItems(demoPages) : []);
        setBuilderSections(toBuilderSectionState(demoSections));
        setWeddingData(demoData);
        applyThemePreset('elegant');
        return true;
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
        const urlToken = getInviteTokenFromSearch(searchParams);
        const { inviteToken, passwordSession } = buildPublicAccessArtifacts(resolvedSlug, searchParams);
        const subresourceAccess = { inviteToken, passwordSession };
        const canUseLocalDemoFallback = DEMO_MODE && !urlToken;
        const shouldUseLocalDemoPreview = canUseLocalDemoFallback || (!urlToken && shouldPreferLocalDemoPublicPreview());
        if (shouldUseLocalDemoPreview && applyDemoFallback('modern-luxe')) {
          return;
        }

        let access: Awaited<ReturnType<typeof fetchPublicSiteAccess>>;
        try {
          access = await withLocalDemoPublicAccessTimeout(
            fetchPublicSiteAccess({
              slug: resolvedSlug,
              inviteToken,
              passwordSession,
              language: i18n.language?.split('-')[0] || 'en',
            }),
            canUseLocalDemoFallback,
          );
        } catch (err) {
          if (canUseLocalDemoFallback && applyDemoFallback('modern-luxe')) {
            return;
          }
          throw err;
        }

        if (access.status === 'coming_soon') {
          if ((isDemoSite || canUseLocalDemoFallback) && applyDemoFallback()) {
            return;
          }
          setIsComingSoon(true);
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
          if (canUseLocalDemoFallback && applyDemoFallback()) {
            return;
          }
          setError('This wedding site is not available right now.');
          setLoading(false);
          return;
        }

        if (urlToken) capturePublicInviteTokenFromSearch(resolvedSlug, searchParams);
        setPublicSubresourceAccess(subresourceAccess);
        trackGuestHubEvent(
          resolvedSlug,
          'view',
          resolveSiteViewAnalyticsTarget(searchParams),
          subresourceAccess,
        ).catch(() => {});

        const data = access.site;
        setWeddingSiteId(data.id as string);

        const siteLang = (data.default_language as string) ?? 'en';
        if (!hasStoredGuestLanguagePreference(resolvedSlug) && (siteLang === 'en' || siteLang === 'es')) {
          i18n.changeLanguage(siteLang);
        }

        const hideSearch = data.allow_search_indexing === false;
        const privacyMode = data.privacy_mode ?? 'public';

        setHideFromSearch(hideSearch);
        setSitePrivacyMode(privacyMode);

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

        if (renderPages.length > 0) {
          const selectedPage = selectPublicSitePage(renderPages, pageSlug);
          if (!selectedPage || (selectedPage.meta?.isHidden === true && Boolean(pageSlug))) {
            setIsComingSoon(true);
            return;
          }
          setPublicPageNavItems(getPublicSitePageNavItems(renderPages));

          const sections = normalizeSectionVariants(selectedPage.sections.filter(s => s.enabled));
          const rawWData = normalizeWeddingData(
            (renderModel.wedding as PublicWeddingRenderModel | WeddingDataV1 | null) ?? createEmptyWeddingData(),
          );
          const wData = withSlugDerivedCoupleNames(await hydrateWeddingDataFromItinerary(resolvedSlug, rawWData, subresourceAccess), resolvedSlug);
          const shouldAppendRegistry = await hasLiveRegistryItems(data.id as string, subresourceAccess);
          const publicSections = appendRegistrySectionWhenNeeded(
            appendRsvpSectionWhenNeeded(sections, shouldAppendPublicRsvpSection(wData)),
            shouldAppendRegistry,
          );
          const sparsePublicData = isPublicWeddingDataSparse(wData);

          if (publicSections.length === 0 || (isDemoSite && sparsePublicData)) {
            if (isDemoSite && applyDemoFallback(data.template_id || 'modern-luxe')) {
              if (renderModel.theme.preset) {
                applyThemePreset(renderModel.theme.preset);
              }
              return;
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
          if (isDemoSite && applyDemoFallback('modern-luxe')) {
            return;
          }

          const rawWData = renderModel.wedding
            ? normalizeWeddingData(renderModel.wedding as PublicWeddingRenderModel | WeddingDataV1)
            : null;

          if (!rawWData) {
            setError('This wedding site is still being set up. Check back soon!');
            setLoading(false);
            return;
          }

          const wData = withSlugDerivedCoupleNames(await hydrateWeddingDataFromItinerary(resolvedSlug, rawWData, subresourceAccess), resolvedSlug);
          if (isDemoSite && isPublicWeddingDataSparse(wData) && applyDemoFallback('modern-luxe')) {
            return;
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
  }, [i18n, i18n.language, pageSlug, resolvedSlug, searchParams, privacyUnlockNonce]);

  const shouldNoIndex = hideFromSearch || sitePrivacyMode !== 'public' || privacyGate === 'invite_only' || privacyGate === 'password_required';
  syncPublicNoIndexMeta(shouldNoIndex);

  useLayoutEffect(() => {
    const meta = syncPublicNoIndexMeta(shouldNoIndex);
    if (!meta) return;

    return () => {
      if (document.head.contains(meta)) meta.remove();
    };
  }, [shouldNoIndex]);

  const passwordGate = (
    <PasswordGate
      onSubmit={handlePasswordSubmit}
      error={passwordGateError}
      checking={passwordGateChecking}
    />
  );
  const fallback = (
    <div className="min-h-screen bg-background">
      <OwnerPreviewBanner />
      <div className="flex min-h-[calc(100vh-65px)] items-center justify-center px-4">
        <div className="max-w-md w-full bg-surface border border-border-subtle rounded-xl p-6 text-center">
          <p className="text-text-secondary">This wedding site is not ready to view yet.</p>
        </div>
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
          {resolvedSlug ? (
            <PublicSitePageNav
              pages={publicPageNavItems}
              sectionAnchors={publicSectionAnchorNavItems}
              siteSlug={resolvedSlug}
              currentPageSlug={pageSlug}
              useRootPaths={isWeddingSubdomainRoute}
            />
          ) : null}
          {builderSections.map(section => (
            <SectionRenderer
              key={section.id}
              section={section}
              weddingData={weddingData}
              surface="public"
              siteSlug={resolvedSlug ?? undefined}
              publicRsvpHref={publicRsvpHref}
            />
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
