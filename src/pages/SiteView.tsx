import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { WeddingDataV1, createEmptyWeddingData } from '../types/weddingData';
import { LayoutConfigV1 } from '../types/layoutConfig';
import { getSectionComponent } from '../sections/sectionRegistry';
import { applyThemePreset } from '../lib/themePresets';
import { BuilderProject } from '../types/builder/project';
import { BuilderSectionInstance } from '../types/builder/section';
import { SectionRenderer } from '../builder/components/SectionRenderer';
import { safeJsonParse } from '../lib/jsonUtils';
import { SiteViewContext } from '../contexts/SiteViewContext';

export const SiteView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [weddingData, setWeddingData] = useState<WeddingDataV1 | null>(null);
  const [builderSections, setBuilderSections] = useState<BuilderSectionInstance[] | null>(null);
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfigV1 | null>(null);
  const [weddingSiteId, setWeddingSiteId] = useState<string | null>(null);
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

        if (siteJson && siteJson.pages?.length > 0) {
          const homePage = siteJson.pages.find(p => p.id === 'home') ?? siteJson.pages[0];
          const sections = homePage.sections.filter(s => s.enabled);
          const wData = safeJsonParse<WeddingDataV1>(data.wedding_data, createEmptyWeddingData());

          if (wData.theme?.preset) {
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
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-10 text-center space-y-4">
          <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-primary">
              <path d="M12 2l1.8 3.8L18 7l-3 2.9.7 4.1L12 12l-3.7 2 .7-4.1L6 7l4.2-1.2z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-light text-text-primary">Not published yet</h1>
          <p className="text-text-secondary">
            This wedding site is still being set up by the couple. Check back soon!
          </p>
          <p className="text-xs text-text-tertiary pt-2 border-t border-border">
            If you're the couple — visit your dashboard and click "Publish" to make your site live.
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

  if (builderSections && weddingData) {
    return (
      <SiteViewContext.Provider value={{ weddingSiteId }}>
        <div className="min-h-screen bg-background">
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
