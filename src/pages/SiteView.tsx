import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { WeddingDataV1 } from '../types/weddingData';
import { LayoutConfigV1 } from '../types/layoutConfig';
import { getSectionComponent } from '../sections/sectionRegistry';
import { applyThemePreset } from '../lib/themePresets';

export const SiteView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [weddingData, setWeddingData] = useState<WeddingDataV1 | null>(null);
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfigV1 | null>(null);
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
          .select('id, wedding_data, layout_config, active_template_id')
          .eq('site_slug', slug)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError('Wedding site not found');
          setLoading(false);
          return;
        }

        if (!data.wedding_data || !data.layout_config) {
          setError('This wedding site is still being set up. Check back soon!');
          setLoading(false);
          return;
        }

        const wData = data.wedding_data as WeddingDataV1;
        const lConfig = data.layout_config as LayoutConfigV1;

        if (wData.version !== '1') {
          setError('Unsupported site configuration version');
          setLoading(false);
          return;
        }

        if (lConfig.version !== '1') {
          setError('Unsupported layout configuration version');
          setLoading(false);
          return;
        }

        if (wData.theme?.preset) {
          applyThemePreset(wData.theme.preset);
        }

        setWeddingData(wData);
        setLayoutConfig(lConfig);
      } catch (err: unknown) {
        console.error('Error loading site:', err);
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
        } catch (err) {
          console.error("Error rendering section " + sectionInstance.type + ":", err);
          return (
            <div key={sectionInstance.id} className="py-8 px-4 bg-error-light text-error text-center">
              <p>Error rendering {sectionInstance.type} section</p>
            </div>
          );
        }
      })}
    </div>
  );
};
