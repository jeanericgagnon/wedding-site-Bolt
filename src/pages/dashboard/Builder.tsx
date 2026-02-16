import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, Button } from '../../components/ui';
import { ChevronUp, ChevronDown, Eye, EyeOff, ExternalLink, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { SiteConfig, SectionConfig } from '../../types/siteConfig';

export const DashboardBuilder: React.FC = () => {
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [sections, setSections] = useState<SectionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [siteSlug, setSiteSlug] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSiteConfig();
  }, []);

  const loadSiteConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: fetchError } = await supabase
        .from('wedding_sites')
        .select('site_json, site_slug')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data && data.site_json) {
        setSiteConfig(data.site_json as SiteConfig);
        setSections((data.site_json as SiteConfig).sections);
        setSiteSlug(data.site_slug);
      } else {
        setError('No site configuration found. Please complete onboarding first.');
      }
    } catch (err: any) {
      console.error('Error loading site config:', err);
      setError(err.message || 'Failed to load site configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveSiteConfig = async () => {
    if (!siteConfig) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updatedConfig: SiteConfig = {
        ...siteConfig,
        sections,
        meta: {
          ...siteConfig.meta,
          updated_at_iso: new Date().toISOString(),
        },
      };

      const { error: updateError } = await supabase
        .from('wedding_sites')
        .update({ site_json: updatedConfig })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setSiteConfig(updatedConfig);
      setSuccessMessage('Changes saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error saving site config:', err);
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (id: string) => {
    setSections(sections.map(s =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex >= 0 && targetIndex < newSections.length) {
      [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
      setSections(newSections);
    }
  };

  const getSectionTitle = (type: string): string => {
    const titles: Record<string, string> = {
      hero: 'Hero / Welcome',
      details: 'Wedding Details',
      schedule: 'Schedule',
      travel: 'Travel & Accommodations',
      rsvp: 'RSVP',
      registry: 'Registry',
      faq: 'FAQ',
      gallery: 'Photo Gallery',
    };
    return titles[type] || type;
  };

  if (loading) {
    return (
      <DashboardLayout currentPage="builder">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-text-secondary">Loading site configuration...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !siteConfig) {
    return (
      <DashboardLayout currentPage="builder">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="bg-error-light text-error p-4 rounded-lg inline-block">
              {error}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="builder">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Website Builder</h1>
          <p className="text-text-secondary mb-4">
            Manage sections on your wedding site. Toggle visibility and reorder sections.
          </p>

          <div className="flex gap-4">
            {siteSlug && (
              <a
                href={`/site/${siteSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Preview Site
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 bg-success/10 border border-success text-success rounded-lg">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-error-light text-error rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <Card variant="default" padding="lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-text-primary">Site Sections</h2>
                <Button
                  variant="primary"
                  size="md"
                  onClick={saveSiteConfig}
                  disabled={saving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>

              <div className="space-y-3">
                {sections.map((section, index) => (
                  <div
                    key={section.id}
                    className={`border rounded-lg p-4 transition-all ${
                      section.enabled
                        ? 'border-border bg-background'
                        : 'border-border bg-surface-subtle opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moveSection(index, 'up')}
                            disabled={index === 0}
                            className="p-1 hover:bg-surface-subtle rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move up"
                          >
                            <ChevronUp className="w-4 h-4 text-text-secondary" />
                          </button>
                          <button
                            onClick={() => moveSection(index, 'down')}
                            disabled={index === sections.length - 1}
                            className="p-1 hover:bg-surface-subtle rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move down"
                          >
                            <ChevronDown className="w-4 h-4 text-text-secondary" />
                          </button>
                        </div>

                        <div className="flex-1">
                          <h3 className="font-medium text-text-primary">
                            {getSectionTitle(section.type)}
                          </h3>
                          <p className="text-sm text-text-secondary capitalize">
                            {section.type}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleSection(section.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          section.enabled
                            ? 'bg-primary/10 text-primary hover:bg-primary/20'
                            : 'bg-surface-subtle text-text-secondary hover:bg-surface'
                        }`}
                        title={section.enabled ? 'Hide section' : 'Show section'}
                      >
                        {section.enabled ? (
                          <Eye className="w-5 h-5" />
                        ) : (
                          <EyeOff className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-text-secondary">
                  Click the eye icon to show/hide sections. Use the arrows to reorder sections.
                  Don't forget to save your changes!
                </p>
              </div>
            </Card>
          </div>

          <div>
            <Card variant="default" padding="lg">
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                Template Information
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-text-secondary mb-1">Template</h3>
                  <p className="text-text-primary capitalize">{siteConfig?.template_id}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-text-secondary mb-1">Color Scheme</h3>
                  <p className="text-text-primary capitalize">{siteConfig?.theme.preset}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-text-secondary mb-1">Enabled Sections</h3>
                  <p className="text-text-primary">
                    {sections.filter(s => s.enabled).length} of {sections.length}
                  </p>
                </div>

                {siteSlug && (
                  <div>
                    <h3 className="text-sm font-medium text-text-secondary mb-1">Site URL</h3>
                    <code className="text-sm text-primary bg-primary/5 px-2 py-1 rounded">
                      /site/{siteSlug}
                    </code>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="text-sm font-medium text-text-primary mb-3">Coming Soon</h3>
                <ul className="space-y-2 text-sm text-text-secondary">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    Content editor for each section
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    Template switcher
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    Custom color themes
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    Photo uploads for gallery
                  </li>
                </ul>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
