import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
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

export const SiteView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [weddingData, setWeddingData] = useState<WeddingDataV1 | null>(null);
  const [builderSections, setBuilderSections] = useState<BuilderSectionInstance[] | null>(null);
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfigV1 | null>(null);
  const [weddingSiteId, setWeddingSiteId] = useState<string | null>(null);
  const [useNewRenderer, setUseNewRenderer] = useState(false);
  const [isComingSoon, setIsComingSoon] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSite = async () => {
      if (!slug) {
        setError('Invalid site URL');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('wedding_sites')
          .select('id, wedding_data, layout_config, site_json, published_json, active_template_id, is_published')
          .eq('site_slug', slug)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError('Wedding site not found');
          setLoading(false);
          return;
        }

        setWeddingSiteId(data.id as string);

        const isPublished = !!(data.is_published);

        if (!isPublished) {
          setIsComingSoon(true);
          setLoading(false);
          return;
        }

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
  }, [slug]);

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-surface px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="relative">
            <div className="w-24 h-24 bg-primary/8 rounded-full flex items-center justify-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-primary/60">
                <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-light text-text-primary mb-3">Coming soon</h1>
            <p className="text-text-secondary leading-relaxed">
              The couple is putting the final touches on their wedding site. Check back soon!
            </p>
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
        <PageRendererFromDB siteId={weddingSiteId} siteSlug={slug ?? ''} />
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
