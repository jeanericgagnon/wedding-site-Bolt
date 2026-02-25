import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { supabase } from '../lib/supabase';
import { WeddingDataV1, createEmptyWeddingData } from '../types/weddingData';
import { LayoutConfigV1 } from '../types/layoutConfig';
import { getSectionComponent } from '../sections/sectionRegistry';
import { applyThemePreset, applyThemeTokens } from '../lib/themePresets';
import { BuilderProject } from '../types/builder/project';
import { BuilderSectionInstance } from '../types/builder/section';
import { SectionRenderer } from '../builder/components/SectionRenderer';
import { PageRenderer } from '../render/PageRenderer';
import { safeJsonParse } from '../lib/jsonUtils';
import { SiteViewContext } from '../contexts/SiteViewContext';
import { siteRepository } from '../data/siteRepository';

const PageRendererFromDB: React.FC<{ siteId: string; siteSlug: string }> = ({ siteId, siteSlug }) => {
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

  return <PageRenderer sections={sections} siteSlug={siteSlug} />;
};

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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-stone-50 to-stone-100 px-4">
      <div className="flex justify-end p-4">
        <LanguageSwitcher />
      </div>
      <div className="flex-1 flex items-center justify-center">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-stone-200" />
          </div>
          <h1 className="text-2xl font-light text-stone-800 mb-2">{t('site.password_gate_title')}</h1>
          <p className="text-stone-500 text-sm">{t('site.password_gate_subtitle')}</p>
        </div>
        <form
          onSubmit={e => { e.preventDefault(); onSubmit(pw); }}
          className="bg-white border border-stone-200 rounded-2xl shadow-sm p-6 space-y-4"
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
              className="w-full px-3 py-2 pr-10 border border-stone-300 rounded-lg text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400"
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
            className="w-full py-2.5 bg-stone-800 text-white rounded-lg font-medium hover:bg-stone-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {checking ? t('site.password_checking') : t('site.password_submit')}
          </button>
        </form>
        <p className="text-center text-xs text-stone-400 mt-4">Powered by DayOf</p>
      </div>
      </div>
    </div>
  );
};

const InviteOnlyGate: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-stone-50 to-stone-100 px-4">
      <div className="flex justify-end p-4">
        <LanguageSwitcher />
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-stone-200" />
          </div>
          <div>
            <h1 className="text-2xl font-light text-stone-800 mb-2">{t('site.invite_only_title')}</h1>
            <p className="text-stone-500 leading-relaxed">{t('site.invite_only_subtitle')}</p>
          </div>
          <p className="text-sm text-stone-500">
            If you received an invitation, check your email for the private link from the couple.
          </p>
          <div className="flex items-center gap-3">
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
      <div className="flex justify-end w-full max-w-md absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-24 h-24 bg-primary/8 rounded-full flex items-center justify-center mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-primary/60">
            <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-light text-text-primary mb-3">{t('site.coming_soon_title')}</h1>
          <p className="text-text-secondary leading-relaxed">{t('site.coming_soon_subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
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
    if (slug) return slug;
    const host = window.location.hostname.toLowerCase();
    if (!host.endsWith('dayof.love')) return null;
    const parts = host.split('.');
    if (parts.length < 3) return null; // dayof.love
    const sub = parts[0];
    if (!sub || sub === 'www') return null;
    return sub;
  }, [slug]);
  const [searchParams] = useSearchParams();
  const { i18n } = useTranslation();
  const [weddingData, setWeddingData] = useState<WeddingDataV1 | null>(null);
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
        setPasswordGateError('Incorrect password. Please try again.');
      }
    } catch {
      setPasswordGateError('Could not verify password. Please try again.');
    } finally {
      setPasswordGateChecking(false);
    }
  };

  useEffect(() => {
    const loadSite = async () => {
      if (!resolvedSlug) {
        setError('Invalid site URL');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('wedding_sites')
          .select('id, wedding_data, layout_config, site_json, published_json, active_template_id, is_published, privacy_mode, site_password_hash, hide_from_search, guest_access_token, default_language')
          .eq('site_slug', resolvedSlug)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError('Wedding site not found');
          setLoading(false);
          return;
        }

        setWeddingSiteId(data.id as string);

        const siteLang = (data.default_language as string) ?? 'en';
        const userPref = localStorage.getItem('dayof_language');
        if (!userPref && (siteLang === 'en' || siteLang === 'es')) {
          i18n.changeLanguage(siteLang);
        }

        const isPublished = !!(data.is_published);

        if (!isPublished) {
          setIsComingSoon(true);
          setLoading(false);
          return;
        }

        const privacyMode = (data.privacy_mode as string) ?? 'public';
        const pwHash = (data.site_password_hash as string | null) ?? null;
        const hideSearch = !!(data.hide_from_search);
        const guestToken = (data.guest_access_token as string | null) ?? null;

        setHideFromSearch(hideSearch);

        if (privacyMode === 'password_protected' && pwHash) {
          const alreadyUnlocked = sessionStorage.getItem(`dayof_pw_unlocked_${resolvedSlug}`) === '1';
          if (!alreadyUnlocked) {
            setPrivacyGate('password_required');
            setLoading(false);
            return;
          }
        } else if (privacyMode === 'invite_only') {
          const urlToken = searchParams.get('token');
          const storedToken = sessionStorage.getItem(`dayof_invite_token_${resolvedSlug}`);
          const tokenToCheck = urlToken ?? storedToken;
          if (!tokenToCheck || (guestToken && tokenToCheck !== guestToken)) {
            setPrivacyGate('invite_only');
            setLoading(false);
            return;
          }
          if (urlToken) {
            sessionStorage.setItem(`dayof_invite_token_${resolvedSlug}`, urlToken);
          }
        }

        setPrivacyGate('open');

        const siteJson = safeJsonParse<BuilderProject | null>(
          data.published_json ?? data.site_json,
          null
        );

        const persistedSections = await siteRepository.fetchPublishedSections(data.id as string).catch(() => []);

        if (persistedSections.length > 0) {
          setUseNewRenderer(true);
          setBuilderSections(null);
          setLayoutConfig(null);
          setWeddingData(null);
          setWeddingSiteId(data.id as string);
          return;
        }

        if (siteJson && siteJson.pages?.length > 0) {
          const homePage = siteJson.pages.find(p => p.id === 'home') ?? siteJson.pages[0];
          const sections = homePage.sections.filter(s => s.enabled);
          const wData = safeJsonParse<WeddingDataV1>(data.wedding_data, createEmptyWeddingData());

          if (siteJson.themeTokens) {
            applyThemeTokens(siteJson.themeTokens);
          } else if (siteJson.themeId) {
            applyThemePreset(siteJson.themeId);
          } else if (wData.theme?.preset) {
            applyThemePreset(wData.theme.preset);
          }

          setBuilderSections(sections);
          setWeddingData(wData);
        } else {
          const wData = safeJsonParse<WeddingDataV1 | null>(data.wedding_data, null);
          const lConfig = safeJsonParse<LayoutConfigV1 | null>(data.layout_config, null);

          if (!wData || !lConfig) {
            setError('This wedding site is still being set up. Check back soon!');
            setLoading(false);
            return;
          }

          if (wData.theme?.preset) {
            applyThemePreset(wData.theme.preset);
          }

          setWeddingData(wData);
          setLayoutConfig(lConfig);
        }
      } catch {
        setError('Failed to load wedding site');
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
  }, [resolvedSlug, searchParams]);

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
        <div className="max-w-md w-full bg-surface border border-border rounded-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text-primary mb-2">Oops!</h1>
          <p className="text-text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  if (useNewRenderer && weddingSiteId) {
    return (
      <SiteViewContext.Provider value={{ weddingSiteId }}>
        <PageRendererFromDB siteId={weddingSiteId} siteSlug={resolvedSlug ?? ''} />
      </SiteViewContext.Provider>
    );
  }

  if (builderSections && weddingData) {
    return (
      <SiteViewContext.Provider value={{ weddingSiteId }}>
        <div className="builder-themed-canvas min-h-screen bg-background">
          {builderSections.map(section => (
            <SectionRenderer key={section.id} section={section} weddingData={weddingData} isPreview />
          ))}
        </div>
      </SiteViewContext.Provider>
    );
  }

  if (!weddingData || !layoutConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full bg-surface border border-border rounded-lg p-8 text-center">
          <p className="text-text-secondary">No wedding site data found</p>
        </div>
      </div>
    );
  }

  const homePage = layoutConfig.pages.find(p => p.id === 'home') || layoutConfig.pages[0];
  if (!homePage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full bg-surface border border-border rounded-lg p-8 text-center">
          <p className="text-text-secondary">No page configuration found</p>
        </div>
      </div>
    );
  }

  const enabledSections = homePage.sections.filter(section => section.enabled);

  return (
    <SiteViewContext.Provider value={{ weddingSiteId }}>
      <div className="min-h-screen bg-background">
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
