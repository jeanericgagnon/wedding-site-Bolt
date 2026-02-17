import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { SectionSettingsDrawer } from '../../components/dashboard/SectionSettingsDrawer';
import { GuidedBuilderModules } from '../../components/dashboard/GuidedBuilderModules';
import { Card, Button } from '../../components/ui';
import { ExternalLink, Save, Edit, Layout as LayoutIcon, Eye, EyeOff, GripVertical, Settings, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { WeddingDataV1, createEmptyWeddingData } from '../../types/weddingData';
import { LayoutConfigV1, SectionInstance } from '../../types/layoutConfig';
import { getSectionVariants } from '../../sections/sectionRegistry';
import { generateInitialLayout, regenerateLayout } from '../../lib/generateInitialLayout';
import { getAllTemplates } from '../../templates/registry';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type BuilderTab = 'guided' | 'canvas';

interface SortableSectionProps {
  section: SectionInstance;
  onToggle: (id: string) => void;
  onVariantChange: (id: string, variant: string) => void;
  onEdit: (id: string) => void;
}

function SortableSection({ section, onToggle, onVariantChange, onEdit }: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const variants = getSectionVariants(section.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-surface border border-border rounded-lg p-4 mb-3"
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-text-secondary hover:text-text-primary"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold text-text-primary capitalize">
                {section.settings.title || section.type}
              </h3>
              <p className="text-xs text-text-secondary capitalize">{section.type} · {section.variant}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(section.id)}
                className="text-text-secondary hover:text-text-primary"
                title="Edit section settings"
                aria-label="Edit section settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => onToggle(section.id)}
                className="text-sm"
                aria-label={section.enabled ? 'Hide section' : 'Show section'}
              >
                {section.enabled ? (
                  <Eye className="w-5 h-5 text-primary" />
                ) : (
                  <EyeOff className="w-5 h-5 text-text-secondary" />
                )}
              </button>
            </div>
          </div>

          {variants.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-secondary">Variant:</label>
              <select
                value={section.variant}
                onChange={(e) => onVariantChange(section.id, e.target.value)}
                className="text-sm border border-border rounded px-2 py-1 bg-surface text-text-primary"
              >
                {variants.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const DashboardBuilder: React.FC = () => {
  const [activeTab, setActiveTab] = useState<BuilderTab>('guided');
  const [weddingData, setWeddingData] = useState<WeddingDataV1 | null>(null);
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfigV1 | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [siteSlug, setSiteSlug] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [switchingTemplate, setSwitchingTemplate] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadWeddingSite();
  }, []);

  const loadWeddingSite = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: fetchError } = await supabase
        .from('wedding_sites')
        .select('wedding_data, layout_config, site_slug, couple_name_1, couple_name_2')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setError('No wedding site found. Please complete onboarding first.');
        return;
      }

      if (data.wedding_data && data.layout_config) {
        setWeddingData(data.wedding_data as WeddingDataV1);
        setLayoutConfig(data.layout_config as LayoutConfigV1);
        setSiteSlug(data.site_slug);
      } else {
        setWeddingData(null);
        setLayoutConfig(null);
        setSiteSlug(data.site_slug);
      }
    } catch (err: unknown) {
      console.error('Error loading wedding site:', err);
      setError((err as Error).message || 'Failed to load wedding site');
    } finally {
      setLoading(false);
    }
  };

  const generateDefaultConfigs = async () => {
    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: fetchError } = await supabase
        .from('wedding_sites')
        .select('couple_name_1, couple_name_2')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Wedding site not found');

      const newWeddingData = createEmptyWeddingData();
      newWeddingData.couple.partner1Name = data.couple_name_1 || '';
      newWeddingData.couple.partner2Name = data.couple_name_2 || '';

      const newLayoutConfig = generateInitialLayout('base', newWeddingData);

      const { error: updateError } = await supabase
        .from('wedding_sites')
        .update({
          wedding_data: newWeddingData,
          layout_config: newLayoutConfig,
          active_template_id: 'base',
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setWeddingData(newWeddingData);
      setLayoutConfig(newLayoutConfig);
      setSuccessMessage('Default layout generated successfully!');
    } catch (err: unknown) {
      console.error('Error generating default configs:', err);
      setError((err as Error).message || 'Failed to generate default configs');
    } finally {
      setSaving(false);
    }
  };

  const saveWeddingData = async () => {
    if (!weddingData) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updatedData = {
        ...weddingData,
        meta: {
          ...weddingData.meta,
          updatedAtISO: new Date().toISOString(),
        },
      };

      const { error: updateError } = await supabase
        .from('wedding_sites')
        .update({ wedding_data: updatedData })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setWeddingData(updatedData);
      setSuccessMessage('Wedding information saved successfully!');
    } catch (err: unknown) {
      console.error('Error saving wedding data:', err);
      setError((err as Error).message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const saveLayoutConfig = async () => {
    if (!layoutConfig) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updatedConfig = {
        ...layoutConfig,
        meta: {
          ...layoutConfig.meta,
          updatedAtISO: new Date().toISOString(),
        },
      };

      const { error: updateError } = await supabase
        .from('wedding_sites')
        .update({ layout_config: updatedConfig, active_template_id: updatedConfig.templateId })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setLayoutConfig(updatedConfig);
      setSuccessMessage('Layout saved successfully!');
    } catch (err: unknown) {
      console.error('Error saving layout:', err);
      setError((err as Error).message || 'Failed to save layout');
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchTemplate = async (newTemplateId: string) => {
    if (!weddingData || !layoutConfig) return;
    if (newTemplateId === layoutConfig.templateId) return;

    setSwitchingTemplate(true);
    setError(null);

    try {
      const newLayout = regenerateLayout(newTemplateId, weddingData, layoutConfig);
      const newWeddingData = {
        ...weddingData,
        theme: {
          ...weddingData.theme,
        },
      };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: updateError } = await supabase
        .from('wedding_sites')
        .update({
          layout_config: newLayout,
          active_template_id: newTemplateId,
          wedding_data: newWeddingData,
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setLayoutConfig(newLayout);
      setWeddingData(newWeddingData);
      setSuccessMessage('Template switched successfully! Your section settings were preserved.');
    } catch (err: unknown) {
      console.error('Error switching template:', err);
      setError((err as Error).message || 'Failed to switch template');
    } finally {
      setSwitchingTemplate(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLayoutConfig((prev) => {
        if (!prev) return prev;

        const homePage = prev.pages[0];
        const oldIndex = homePage.sections.findIndex((s) => s.id === active.id);
        const newIndex = homePage.sections.findIndex((s) => s.id === over.id);

        const newSections = arrayMove(homePage.sections, oldIndex, newIndex);

        return {
          ...prev,
          pages: [
            {
              ...homePage,
              sections: newSections,
            },
          ],
        };
      });
    }
  };

  const toggleSectionEnabled = (sectionId: string) => {
    setLayoutConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pages: [
          {
            ...prev.pages[0],
            sections: prev.pages[0].sections.map((s) =>
              s.id === sectionId ? { ...s, enabled: !s.enabled } : s
            ),
          },
        ],
      };
    });
  };

  const changeSectionVariant = (sectionId: string, variant: string) => {
    setLayoutConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pages: [
          {
            ...prev.pages[0],
            sections: prev.pages[0].sections.map((s) =>
              s.id === sectionId ? { ...s, variant } : s
            ),
          },
        ],
      };
    });
  };

  const updateSectionSettings = (sectionId: string, updates: Partial<SectionInstance>) => {
    setLayoutConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pages: [
          {
            ...prev.pages[0],
            sections: prev.pages[0].sections.map((s) =>
              s.id === sectionId ? { ...s, ...updates } : s
            ),
          },
        ],
      };
    });
  };

  if (loading) {
    return (
      <DashboardLayout currentPage="builder">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-text-secondary">Loading builder...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!weddingData || !layoutConfig) {
    return (
      <DashboardLayout currentPage="builder">
        <Card>
          <div className="p-8 text-center max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-text-primary mb-4">
              Site Not Initialized
            </h2>
            <p className="text-text-secondary mb-6">
              {error || 'Your wedding site configuration is missing. Generate a default layout to get started.'}
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={generateDefaultConfigs} disabled={saving}>
                {saving ? 'Generating...' : 'Generate Default Layout'}
              </Button>
              {error && (
                <Button variant="outline" onClick={loadWeddingSite}>
                  Retry
                </Button>
              )}
            </div>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  const templates = getAllTemplates();

  return (
    <DashboardLayout currentPage="builder">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Site Builder</h1>
            <p className="text-text-secondary mt-1">
              Customize your wedding website content and layout
            </p>
          </div>
          {siteSlug && (
            <Button
              variant="outline"
              onClick={() => window.open('/site/' + siteSlug, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Preview Site
            </Button>
          )}
        </div>

        {successMessage && (
          <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg text-primary">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-error-light border border-error rounded-lg text-error">
            {error}
          </div>
        )}

        <div className="mb-6 flex gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab('guided')}
            className={"px-6 py-3 font-medium flex items-center gap-2 " + (
              activeTab === 'guided'
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            <Edit className="w-4 h-4" />
            Guided
          </button>
          <button
            onClick={() => setActiveTab('canvas')}
            className={"px-6 py-3 font-medium flex items-center gap-2 " + (
              activeTab === 'canvas'
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            <LayoutIcon className="w-4 h-4" />
            Canvas
          </button>
        </div>

        {activeTab === 'guided' && weddingData && layoutConfig && weddingData.couple && (
          <GuidedBuilderModules
            weddingData={weddingData}
            layoutConfig={layoutConfig}
            onChange={setWeddingData}
            onLayoutChange={setLayoutConfig}
            onSave={saveWeddingData}
            saving={saving}
          />
        )}

        {activeTab === 'canvas' && layoutConfig && (
          <div className="space-y-6">
            <Card>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-text-primary mb-2">Template</h2>
                <p className="text-text-secondary text-sm mb-5">
                  Switch templates to change section order and variants. Your existing content and settings are preserved.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {templates.map(tpl => (
                    <button
                      key={tpl.id}
                      onClick={() => handleSwitchTemplate(tpl.id)}
                      disabled={switchingTemplate}
                      className={"p-4 rounded-xl border-2 text-left transition-all " + (
                        layoutConfig.templateId === tpl.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40 hover:bg-surface-subtle'
                      )}
                      aria-pressed={layoutConfig.templateId === tpl.id}
                    >
                      <div className="aspect-[3/4] rounded-lg bg-surface-subtle mb-3 flex items-center justify-center overflow-hidden">
                        <div className="space-y-1.5 w-full px-3">
                          <div className="h-2 bg-primary/20 rounded-full w-full" />
                          <div className="h-1.5 bg-border rounded-full w-3/4" />
                          <div className="h-1.5 bg-border rounded-full w-1/2" />
                          <div className="h-6 bg-primary/10 rounded mt-2" />
                          <div className="h-1.5 bg-border rounded-full w-full" />
                          <div className="h-1.5 bg-border rounded-full w-5/6" />
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-text-primary">{tpl.name}</p>
                      <p className="text-xs text-text-secondary mt-0.5 leading-snug">{tpl.description}</p>
                      {layoutConfig.templateId === tpl.id && (
                        <span className="inline-block mt-2 text-xs text-primary font-medium">Active</span>
                      )}
                    </button>
                  ))}
                </div>
                {switchingTemplate && (
                  <div className="flex items-center gap-2 mt-4 text-sm text-primary">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Switching template...
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-text-primary mb-2">
                  Sections
                </h2>
                <p className="text-text-secondary text-sm mb-6">
                  Drag to reorder, click eye icon to show/hide, change variant per section
                </p>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={layoutConfig.pages[0].sections.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {layoutConfig.pages[0].sections.map((section) => (
                      <SortableSection
                        key={section.id}
                        section={section}
                        onToggle={toggleSectionEnabled}
                        onVariantChange={changeSectionVariant}
                        onEdit={setEditingSectionId}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button
                variant="accent"
                onClick={saveLayoutConfig}
                disabled={saving}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Layout'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {weddingData && layoutConfig && editingSectionId && (
        <SectionSettingsDrawer
          section={layoutConfig.pages[0].sections.find((s) => s.id === editingSectionId)!}
          weddingData={weddingData}
          isOpen={!!editingSectionId}
          onClose={() => setEditingSectionId(null)}
          onUpdate={(updates) => updateSectionSettings(editingSectionId, updates)}
        />
      )}
    </DashboardLayout>
  );
};
