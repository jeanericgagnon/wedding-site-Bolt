import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { validateSiteConfig } from '../lib/siteConfigValidate';
import type { SiteConfig } from '../types/siteConfig';
import {
  HeroSection,
  DetailsSection,
  ScheduleSection,
  TravelSection,
  RegistrySection,
  FaqSection,
  RsvpSection,
  GallerySection,
} from '../components/site/sections';

export const SiteView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weddingSiteId, setWeddingSiteId] = useState<string | null>(null);

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
          .select('id, site_json, couple_name_1, couple_name_2')
          .eq('site_slug', slug)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError('Wedding site not found');
          setLoading(false);
          return;
        }

        setWeddingSiteId(data.id);

        if (!data.site_json) {
          setError('This wedding site is still being set up. Check back soon!');
          setLoading(false);
          return;
        }

        const validation = validateSiteConfig(data.site_json);
        if (!validation.ok) {
          console.error('Site config validation errors:', validation.errors);
          setError('This wedding site has configuration errors. Please contact the couple.');
          setLoading(false);
          return;
        }

        setSiteConfig(data.site_json as SiteConfig);
      } catch (err: any) {
        console.error('Error loading site:', err);
        setError('Failed to load wedding site');
      } finally {
        setLoading(false);
      }
    };

    loadSite();
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

  if (error || !siteConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            {error || 'Wedding site not found'}
          </h1>
          <p className="text-text-secondary">
            Please check the URL and try again, or contact the couple for the correct link.
          </p>
        </div>
      </div>
    );
  }

  const renderSection = (section: SiteConfig['sections'][0]) => {
    if (!section.enabled) return null;

    const content = siteConfig.content[section.props_key];
    if (!content) return null;

    switch (section.type) {
      case 'hero':
        return <HeroSection key={section.id} content={content} />;
      case 'details':
        return <DetailsSection key={section.id} content={content} />;
      case 'schedule':
        return <ScheduleSection key={section.id} content={content} />;
      case 'travel':
        return <TravelSection key={section.id} content={content} />;
      case 'registry':
        return <RegistrySection key={section.id} content={content} />;
      case 'faq':
        return <FaqSection key={section.id} content={content} />;
      case 'rsvp':
        return <RsvpSection key={section.id} content={content} weddingSiteId={weddingSiteId || undefined} />;
      case 'gallery':
        return <GallerySection key={section.id} content={content} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {siteConfig.sections.map(renderSection)}
    </div>
  );
};
