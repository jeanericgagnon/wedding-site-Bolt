import React, { useRef, useEffect } from 'react';
import { X, ChevronDown, ImageIcon, Eye, EyeOff, Pencil, Palette, Database, Image, Plus, Trash2, Compass, Ruler, Link2, Copy } from 'lucide-react';
import { useBuilderContext } from '../state/builderStore';
import { builderActions } from '../state/builderActions';
import { markFieldAsUserEdited, readBuilderValue } from '../../lib/weddingProfile';
import { selectSelectedSection, selectActivePage, selectActivePageSections } from '../state/builderSelectors';
import { getSectionManifest } from '../registry/sectionManifests';
import { getVariantPreviewSource } from '../registry/variantPreviewSource';
import { BuilderSectionRail } from './BuilderSectionRail';
import { BuilderSectionInstance, BuilderSettingsField } from '../../types/builder/section';
import { CustomBlock } from '../../sections/variants/custom/skeletons';
import { sanitizeBuilderCustomCss, sanitizeCustomClassName } from '../utils/customCss';
import { copyTextOrDownload } from '../../lib/copyText';
import { getVariantQualityScore } from '../utils/variantQuality';
import {
  applyBuilderStyleRecipe,
  BUILDER_STYLE_RECIPES,
  clearBuilderStyleRecipe,
  type BuilderStyleRecipeId,
} from '../utils/styleRecipes';
import { getVariantRecommendation, sortVariantsByRecommendation } from '../utils/variantRecommendations';
import { getDefaultSectionAnchorId, isSectionAnchorRedundantWithPage, normalizePageAnchorSlug, normalizeSectionAnchorId } from '../utils/sectionAnchors';
import {
  analyzeBuilderCopy,
  cleanBuilderCopy,
  rewriteBuilderCopy,
  type BuilderRewriteTone,
} from '../../lib/invisibleIntelligence';

type InspectorTab = 'guide' | 'content' | 'style' | 'layout' | 'data';
type CustomizationLevel = 'basic' | 'design' | 'expert';

export function sanitizeSectionAnchorId(value: string): string {
  return normalizeSectionAnchorId(value);
}

export function buildSectionAnchorPath(
  siteSlug: string | null | undefined,
  page: { id?: string | null; slug: unknown; title?: unknown; meta: { isHome: boolean; isHidden?: boolean } },
  anchorId: string
): string | null {
  const cleanAnchorId = sanitizeSectionAnchorId(anchorId);
  if (!cleanAnchorId || page.meta.isHidden || isSectionAnchorRedundantWithPage(cleanAnchorId, page)) {
    return null;
  }

  const cleanSiteSlug = siteSlug?.trim();

  if (!cleanSiteSlug) {
    return `#${encodeURIComponent(cleanAnchorId)}`;
  }

  const encodedSiteSlug = encodeURIComponent(cleanSiteSlug);
  const normalizedPageSlug = normalizePageAnchorSlug(page.slug) || normalizePageAnchorSlug(page.id ?? '');
  const pageSegment = page.meta.isHome || normalizedPageSlug === 'home'
    ? ''
    : `/${encodeURIComponent(normalizedPageSlug || 'page')}`;

  return `/site/${encodedSiteSlug}${pageSegment}#${encodeURIComponent(cleanAnchorId)}`;
}

export function resolveSectionAnchorId(
  section: Pick<BuilderSectionInstance, 'id' | 'type' | 'settings'>,
): string {
  const sectionAnchorValue = readBuilderValue(section.settings.anchorId as string | { value: string } | undefined, '');
  return sanitizeSectionAnchorId(sectionAnchorValue || getDefaultSectionAnchorId(section.type) || section.id) || section.id;
}

export const BuilderInspectorPanel: React.FC = () => {
  const { state, dispatch, publicSiteSlug } = useBuilderContext();
  const [activeTab, setActiveTab] = React.useState<InspectorTab>('content');
  const [customizationLevel, setCustomizationLevel] = React.useState<CustomizationLevel>('basic');
  const [showVariantPicker, setShowVariantPicker] = React.useState(false);
  const [variantSearch, setVariantSearch] = React.useState('');
  const [copiedAnchorLink, setCopiedAnchorLink] = React.useState<'copied' | 'downloaded' | null>(null);
  const [showSectionLinkTools, setShowSectionLinkTools] = React.useState(false);
  const anchorCopyRequestIdRef = useRef(0);
  const selectedSection = selectSelectedSection(state);
  const activePage = selectActivePage(state);
  const activeSections = selectActivePageSections(state);
  const simpleMode = customizationLevel === 'basic';
  const showAdvanced = customizationLevel !== 'basic';
  const showExpert = customizationLevel === 'expert';
  const recommendationContext = {
    weddingData: state.weddingData,
    activeSections,
    themeId: state.project?.themeId,
  };

  useEffect(() => {
    if (selectedSection) {
      setActiveTab('content');
      setVariantSearch('');
      setShowSectionLinkTools(false);
    }
  }, [selectedSection?.id]);

  useEffect(() => {
    if (simpleMode && (activeTab === 'style' || activeTab === 'data' || activeTab === 'guide')) {
      setActiveTab('content');
    }
  }, [simpleMode, activeTab]);

  useEffect(() => {
    if (simpleMode) {
      setShowSectionLinkTools(false);
    }
  }, [simpleMode]);

  useEffect(() => {
    if (!copiedAnchorLink) return;
    const timeout = window.setTimeout(() => setCopiedAnchorLink(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [copiedAnchorLink]);

  const selectedIndex = activeSections.findIndex((s) => s.id === state.selectedSectionId);

  const quickSectionRail = activePage ? (
    <BuilderSectionRail
      activePageId={activePage.id}
      activeSections={activeSections as Array<{ id: string; type: string }>}
      selectedSectionId={state.selectedSectionId}
      onSelectSection={(sectionId) => dispatch(builderActions.selectSection(sectionId))}
      onAddSection={(type, variantId) => dispatch(builderActions.addSectionByType(activePage.id, type as any, undefined, variantId))}
      onReorderSections={(orderedIds) => dispatch(builderActions.reorderSections(activePage.id, orderedIds))}
      weddingData={state.weddingData}
      themeId={state.project?.themeId}
      onSwitchTemplate={() => {
        dispatch(builderActions.selectSection(null));
        dispatch(builderActions.openTemplateGallery());
      }}
    />
  ) : null;

  if (!activePage) {
    return (
      <aside className="w-full lg:w-[520px] bg-white border-t lg:border-t-0 lg:border-l border-neutral-200 flex flex-col h-full overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <p className="text-sm text-[var(--color-text-tertiary)]">Choose a page to keep editing.</p>
        </div>
      </aside>
    );
  }

  if (!selectedSection) {
    return (
      <aside className="w-full lg:w-[520px] bg-white border-t lg:border-t-0 lg:border-l border-neutral-200 flex flex-col h-full overflow-hidden">
        {quickSectionRail}
      </aside>
    );
  }

  const manifest = getSectionManifest(selectedSection.type);
  const hasBindings = manifest.capabilities.hasBindings && manifest.bindingsSchema.slots.length > 0;
  const filteredVariantMeta = sortVariantsByRecommendation(manifest.type, manifest.variantMeta, recommendationContext).filter((variant) => {
    const q = variantSearch.trim().toLowerCase();
    if (!q) return true;
    return `${variant.label} ${variant.description} ${variant.bestFor ?? ''} ${variant.effort ?? ''} ${variant.id}`.toLowerCase().includes(q);
  });

  const hasMeaningfulContent = Object.entries(selectedSection.settings ?? {}).some(([k, v]) => {
    if (k === 'showTitle') return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return true;
    if (Array.isArray(v)) return v.length > 0;
    return !!v;
  });
  const hasStyleOverrides = Object.values(selectedSection.styleOverrides ?? {}).some((v) => v !== undefined && v !== '');
  const hasLayoutCustomization = selectedSection.variant !== manifest.defaultVariant
    || !!selectedSection.styleOverrides?.paddingTop
    || !!selectedSection.styleOverrides?.paddingBottom;
  const dataConfigured = !hasBindings
    || manifest.bindingsSchema.slots.every((slot) => {
      const bound = (selectedSection.bindings as Record<string, unknown> | undefined)?.[slot.key];
      return Array.isArray(bound) ? bound.length > 0 : bound !== undefined;
    });

  const guideSteps = [
    { id: 'content', label: 'Add section content', done: hasMeaningfulContent },
    { id: 'style', label: 'Match the visual style', done: hasStyleOverrides },
    { id: 'layout', label: 'Choose layout and spacing', done: hasLayoutCustomization },
    { id: 'data', label: 'Check connected data', done: dataConfigured && hasBindings, optional: !hasBindings },
    { id: 'visibility', label: 'Keep section visible', done: selectedSection.enabled },
  ];
  const requiredGuideSteps = guideSteps.filter((s) => !s.optional);
  const guideProgress = Math.round((requiredGuideSteps.filter((s) => s.done).length / Math.max(requiredGuideSteps.length, 1)) * 100);

  const nextAction = (() => {
    if (!hasMeaningfulContent) return { key: 'content', cta: 'Open content', label: 'Add your content', tab: 'content' as InspectorTab, detail: 'Add the headline, text, or details guests should actually see.' };
    if (!hasLayoutCustomization) return { key: 'layout', cta: 'Open layout', label: 'Pick layout and spacing', tab: 'layout' as InspectorTab, detail: 'Choose the version that fits best and tighten the spacing.' };
    if (!hasStyleOverrides) return { key: 'style', cta: 'Open style', label: 'Match the visual style', tab: 'style' as InspectorTab, detail: 'Bring this section closer to the rest of your website.' };
    if (!selectedSection.enabled) return { key: 'visibility', cta: 'Open layout', label: 'Turn this section on', tab: 'layout' as InspectorTab, detail: 'This section is currently hidden from your website.' };
    return { key: 'preview-mobile', cta: 'Preview mobile', label: 'Preview on mobile', tab: 'layout' as InspectorTab, detail: 'Check the mobile view before sharing with guests.' };
  })();
  const copyHealth = analyzeBuilderCopy({
    sectionType: selectedSection.type,
    settings: selectedSection.settings ?? {},
    siblingSections: activeSections.map((section) => ({
      id: section.id,
      type: section.type,
      settings: section.settings as Record<string, unknown> | undefined,
    })),
  });

  const handleUpdateSetting = (key: string, value: string | boolean | number) => {
    const nextValue = typeof value === 'string' ? markFieldAsUserEdited(value) : value;
    dispatch(
      builderActions.updateSection(activePage.id, selectedSection.id, {
        settings: { ...selectedSection.settings, [key]: nextValue },
      })
    );
  };

  const handleChangeVariant = (variant: string) => {
    dispatch(builderActions.updateSection(activePage.id, selectedSection.id, { variant }));
  };

  const handleToggleVisibility = () => {
    dispatch(builderActions.toggleSectionVisibility(activePage.id, selectedSection.id));
  };

  const sectionAnchorValue = readBuilderValue(selectedSection.settings.anchorId as string | { value: string } | undefined, '');
  const defaultSectionAnchorId = getDefaultSectionAnchorId(selectedSection.type);
  const resolvedSectionAnchorId = resolveSectionAnchorId(selectedSection);
  const sectionAnchorPath = selectedSection.enabled === false ? null : buildSectionAnchorPath(publicSiteSlug, activePage, resolvedSectionAnchorId);
  const handleCopySectionAnchor = async () => {
    if (!sectionAnchorPath) return;
    const requestId = ++anchorCopyRequestIdRef.current;
    const copyText = sectionAnchorPath.startsWith('/') && typeof window !== 'undefined'
      ? new URL(sectionAnchorPath, window.location.origin).toString()
      : sectionAnchorPath;

    try {
      const result = await copyTextOrDownload(copyText, 'dayof-section-anchor-link.txt');
      if (requestId === anchorCopyRequestIdRef.current) {
        setCopiedAnchorLink(result);
      }
    } catch {
      if (requestId === anchorCopyRequestIdRef.current) {
        dispatch(builderActions.setError('Couldn’t copy that section link right now.'));
      }
    }
  };

  const tabs: { id: InspectorTab; icon: React.ComponentType<{ size?: string | number; className?: string }>; label: string; show: boolean }[] = [
    { id: 'guide' as InspectorTab, icon: Compass, label: 'Guide', show: true },
    { id: 'content' as InspectorTab, icon: Pencil, label: 'Content', show: manifest.settingsSchema.fields.length > 0 },
    { id: 'style' as InspectorTab, icon: Palette, label: 'Style', show: true },
    { id: 'layout' as InspectorTab, icon: Ruler, label: 'Layout', show: true },
    { id: 'data' as InspectorTab, icon: Database, label: 'Data', show: hasBindings },
  ].filter(t => t.show);

  const visibleTabs = tabs.filter((tab) => {
    if (simpleMode) return tab.id === 'content' || tab.id === 'layout';
    if (tab.id === 'guide' || tab.id === 'content' || tab.id === 'layout') return true;
    return showAdvanced;
  });

  return (
    <aside className="w-full lg:w-[520px] bg-white border-t lg:border-t-0 lg:border-l border-neutral-200 flex flex-col h-full overflow-hidden">
      <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
        <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
          <h3 className="text-[24px] font-semibold text-[var(--color-text-primary)]">Edit section</h3>
        </div>
        <div className="px-3 py-2.5 space-y-2 border-b border-[var(--color-border-subtle)]">
            <button
              type="button"
              onClick={() => {
                setActiveTab('layout');
                setShowVariantPicker(true);
              }}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-[13px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]"
            >
            Change section layout
            </button>
        </div>
        <div className="px-4 py-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
          <p className="mb-1.5 text-[10px] font-semibold text-[var(--color-text-tertiary)]">Customization level</p>
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] p-1">
            {([
              ['basic', 'Basic', 'Content and layout'],
              ['design', 'Design', 'Style controls'],
              ['expert', 'Expert', 'Scoped CSS'],
            ] as const).map(([level, label, title]) => (
              <button
                key={level}
                type="button"
                title={title}
                onClick={() => {
                  setCustomizationLevel(level);
                  if (level === 'basic' && (activeTab === 'style' || activeTab === 'data' || activeTab === 'guide')) setActiveTab('content');
                  if (level !== 'basic' && activeTab === 'content') setActiveTab('style');
                }}
                className={`rounded-xl px-2 py-1.5 text-[11px] font-medium transition-colors ${
                  customizationLevel === level
                    ? 'bg-white text-[var(--color-text-primary)] ring-1 ring-[var(--color-border-subtle)]'
                    : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--color-text-tertiary)]">
            Basic is best for most couples. Expert is for code-level polish and can be reset at any time.
          </p>
        </div>
        <button
          type="button"
          onClick={() => dispatch(builderActions.selectSection(null))}
          className="w-full text-left px-4 py-2.5 text-[14px] text-[var(--color-primary)] hover:bg-[var(--color-surface-subtle)]"
        >
          ← Back to sections
        </button>
      </div>

      <div className="px-4 py-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-3">
        <div>
          <h3 className="text-[18px] font-semibold text-[var(--color-text-primary)]">{manifest.label}</h3>
          <p className="mt-1 text-[14px] text-[var(--color-text-secondary)]">Edit the content, layout, and style for this section.</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-3 py-2.5">
          <p className="text-[11px] font-semibold text-[var(--color-text-primary)]">Best next step</p>
          <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">{nextAction.detail}</p>
          <button
            onClick={() => {
              if (nextAction.tab !== 'content' && nextAction.tab !== 'guide') {
                setCustomizationLevel('design');
              }
              setActiveTab(nextAction.tab);
            }}
            className="mt-2 inline-flex items-center rounded-xl border border-[var(--color-border-subtle)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] hover:border-[var(--color-primary)]/25 hover:bg-[var(--color-surface)]"
          >
            {nextAction.cta}
          </button>
        </div>
      </div>

      {!simpleMode && (
        <div className="px-3 py-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
          <div className="flex items-center flex-wrap gap-1">
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-xl border transition-colors ${
                  activeTab === tab.id
                    ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-light)]'
                    : 'border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
                }`}
              >
                <tab.icon size={12} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showVariantPicker && (
        <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[var(--color-text-primary)]">Choose a layout</p>
            <button
              type="button"
              onClick={() => setShowVariantPicker(false)}
              className="text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              Done
            </button>
          </div>
          <input
            type="search"
            value={variantSearch}
            onChange={(event) => setVariantSearch(event.target.value)}
            placeholder="Search layouts by vibe or structure"
            className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-3 py-2 text-xs text-[var(--color-text-primary)] outline-none focus:bg-white focus:ring-2 focus:ring-[var(--color-accent)]"
          />
          <p className="text-[10px] text-[var(--color-text-tertiary)]">Switching layouts preserves the content, photos, RSVP links, and connected data for this section.</p>
          <div className="grid grid-cols-2 gap-2">
            {filteredVariantMeta.map((v) => {
              const active = selectedSection.variant === v.id;
              const recommendation = getVariantRecommendation(manifest.type, v, recommendationContext);
              const quality = getVariantQualityScore(manifest.type, v, manifest.variantMeta.length);
              const mobileRisk = quality.flags.includes('mobile-risk');
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleChangeVariant(v.id)}
                  className={`text-left rounded-xl border px-2.5 py-2 ${active ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]' : 'border-[var(--color-border-subtle)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-subtle)]'}`}
                >
                  <div className="mb-2 h-20 overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-white">
                    <img
                      src={`/variant-previews/${selectedSection.type}__${getVariantPreviewSource(selectedSection.type, v.id)}.webp`}
                      alt={`${manifest.label} ${v.label} preview`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = '/template-previews/_fallback.svg';
                      }}
                    />
                  </div>
                  <div className="flex items-start justify-between gap-1.5">
                    <p className="text-xs font-medium text-[var(--color-text-primary)]">{v.label}</p>
                    {recommendation.label && (
                      <span className="shrink-0 rounded-xl border border-[var(--color-border-subtle)] bg-white px-1.5 py-0.5 text-[9px] font-semibold text-[var(--color-text-secondary)]">{recommendation.label}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--color-text-tertiary)] line-clamp-2">{v.description || 'Layout option'}</p>
                  {recommendation.reasons[0] ? (
                    <p className="mt-1 rounded-xl bg-white px-1.5 py-1 text-[10px] leading-snug text-[var(--color-text-secondary)]">{recommendation.reasons[0]}</p>
                  ) : v.bestFor && (
                    <p className="mt-1 text-[10px] leading-snug text-[var(--color-text-secondary)] line-clamp-2">Best for {v.bestFor}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {v.recommended && (
                      <span className="rounded-xl border border-[var(--color-border-subtle)] bg-white px-1.5 py-0.5 text-[9px] font-semibold text-[var(--color-text-secondary)]">Recommended</span>
                    )}
                    {v.effort && (
                      <span className="rounded-xl border border-[var(--color-border-subtle)] bg-white px-1.5 py-0.5 text-[9px] font-medium text-[var(--color-text-tertiary)]">{v.effort}</span>
                    )}
                    {mobileRisk && (
                      <span className="rounded-xl border border-[var(--color-border-subtle)] bg-white px-1.5 py-0.5 text-[9px] font-medium text-[var(--color-text-secondary)]">Check mobile</span>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--color-primary)] mt-1 font-medium">Use this layout</p>
                </button>
              );
            })}
            {filteredVariantMeta.length === 0 && (
              <div className="col-span-2 rounded-xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-3 py-6 text-center text-xs text-[var(--color-text-tertiary)]">
                No layouts match that search.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'guide' && (
          <div className="p-4 space-y-4">
            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] p-3">
              <p className="text-xs font-semibold text-[var(--color-text-primary)] mb-1">Quick guide</p>
              <p className="text-[11px] text-[var(--color-text-secondary)]">Use these focused views to make edits faster without digging through every control.</p>
              <div className="mt-2">
                <div className="h-1.5 overflow-hidden rounded-sm bg-white">
                  <div className="h-full bg-[var(--color-primary)]" style={{ width: `${guideProgress}%` }} />
                </div>
                <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">Section setup progress: {guideProgress}%</p>
              </div>
            </div>

            <div className="space-y-1.5">
              {guideSteps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => !step.optional && setActiveTab(step.id === 'visibility' ? 'layout' : (step.id as InspectorTab))}
                  disabled={step.optional}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition-colors ${step.done ? 'border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]' : 'border-[var(--color-border-subtle)] bg-white text-[var(--color-text-primary)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-primary)]'} ${step.optional ? 'opacity-60 cursor-default' : ''}`}
                >
                  <span className="font-medium">{step.label}</span>
                  <span className="ml-2 text-[10px]">{step.optional ? 'optional' : step.done ? 'done' : 'next'}</span>
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-white p-3">
              <p className="text-xs font-semibold text-[var(--color-text-primary)] mb-1">Best next step</p>
              <p className="text-[11px] text-[var(--color-text-secondary)]">{nextAction.detail}</p>
              <button
                onClick={() => {
                  if (nextAction.tab !== 'content' && nextAction.tab !== 'guide') {
                    setCustomizationLevel('design');
                  }
                  setActiveTab(nextAction.tab);
                }}
                className="mt-3 inline-flex items-center rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-3 py-2 text-xs font-medium text-[var(--color-text-primary)] hover:border-[var(--color-border)] hover:bg-white"
              >
                {nextAction.cta}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'content', label: 'Edit content' },
                { id: 'style', label: 'Adjust style' },
                { id: 'layout', label: 'Change layout' },
                { id: 'data', label: 'Connected data' },
              ].filter((view) => view.id !== 'data' || hasBindings).map((view) => (
                <button
                  key={view.id}
                  onClick={() => {
                    if (view.id !== 'content' && view.id !== 'guide') {
                      setCustomizationLevel('design');
                    }
                    setActiveTab(view.id as InspectorTab);
                  }}
                  className="rounded-xl border border-[var(--color-border-subtle)] bg-white px-3 py-2 text-xs font-medium text-[var(--color-text-primary)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  {view.label}
                </button>
              ))}
            </div>
            <div className="rounded-xl border border-gray-100 bg-[var(--color-surface-subtle)] p-3 text-[11px] text-[var(--color-text-secondary)] space-y-2">
              <p><span className="font-semibold">Tip:</span> layout changes preserve your content and connected data.</p>
              <p><span className="font-semibold">Tip:</span> check desktop, tablet, and mobile before sharing with guests.</p>
              <p><span className="font-semibold">Tip:</span> keep moving in this order: content first, then layout, then style.</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  onClick={() => dispatch(builderActions.setPreviewViewport('desktop'))}
                  className="rounded-xl border border-[var(--color-border-subtle)] bg-white px-2 py-1 text-[10px] font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:text-[var(--color-text-primary)]"
                >
                  Check desktop
                </button>
                <button
                  onClick={() => dispatch(builderActions.setPreviewViewport('tablet'))}
                  className="rounded-xl border border-[var(--color-border-subtle)] bg-white px-2 py-1 text-[10px] font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:text-[var(--color-text-primary)]"
                >
                  Check tablet
                </button>
                <button
                  onClick={() => dispatch(builderActions.setPreviewViewport('mobile'))}
                  className="rounded-xl border border-[var(--color-border-subtle)] bg-white px-2 py-1 text-[10px] font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:text-[var(--color-text-primary)]"
                >
                  Check mobile
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="p-4 space-y-1">
            <div className="mb-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-primary)]">
                    <Link2 size={12} />
                    Section link
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
                    Most sections can use the page link as-is. Open advanced link settings only if you need a custom anchor.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSectionLinkTools((current) => !current)}
                  aria-expanded={showSectionLinkTools}
                  className="inline-flex shrink-0 items-center rounded-xl border border-[var(--color-border-subtle)] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[var(--color-text-primary)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface)]"
                >
                  {showSectionLinkTools ? 'Hide advanced link settings' : 'Show advanced link settings'}
                </button>
              </div>
              {showSectionLinkTools ? (
                <div className="mt-3 space-y-2">
                  <label htmlFor={`section-anchor-${selectedSection.id}`} className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-primary)]">
                    <Link2 size={12} />
                    Section anchor
                  </label>
                  <div className="flex items-center rounded-xl border border-[var(--color-border-subtle)] bg-white px-2.5 py-2 text-sm">
                    <span className="mr-1 text-[var(--color-text-tertiary)]">#</span>
                    <input
                      id={`section-anchor-${selectedSection.id}`}
                      value={sectionAnchorValue}
                      onChange={(event) => handleUpdateSetting('anchorId', sanitizeSectionAnchorId(event.target.value))}
                      placeholder={defaultSectionAnchorId ?? selectedSection.id}
                      className="min-w-0 flex-1 bg-transparent text-[var(--color-text-primary)] outline-none"
                    />
                  </div>
                  <div className="mt-2 flex min-w-0 items-center gap-2">
                    {sectionAnchorPath ? (
                      <>
                        <code className="min-w-0 flex-1 truncate rounded-xl border border-[var(--color-border-subtle)] bg-white px-2.5 py-1.5 text-[11px] text-[var(--color-text-secondary)]">
                          {sectionAnchorPath}
                        </code>
                        <button
                          type="button"
                          aria-label={`Copy section anchor link ${sectionAnchorPath}`}
                          title={`Copy ${sectionAnchorPath}`}
                          onClick={handleCopySectionAnchor}
                          className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[var(--color-border-subtle)] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[var(--color-text-primary)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface)]"
                        >
                          <Copy size={12} />
                          {copiedAnchorLink === 'downloaded' ? 'Downloaded' : copiedAnchorLink === 'copied' ? 'Copied' : 'Copy'}
                        </button>
                      </>
                    ) : (
                      <p className="min-w-0 flex-1 rounded-xl border border-[var(--color-border-subtle)] bg-white px-2.5 py-1.5 text-[11px] text-[var(--color-text-tertiary)]">
                        This section uses the page link or is hidden from guests.
                      </p>
                    )}
                    {defaultSectionAnchorId && sectionAnchorValue !== defaultSectionAnchorId ? (
                      <button
                        type="button"
                        aria-label={`Use default anchor ${defaultSectionAnchorId}`}
                        title={`Use #${defaultSectionAnchorId}`}
                        onClick={() => handleUpdateSetting('anchorId', defaultSectionAnchorId)}
                        className="inline-flex shrink-0 items-center rounded-xl border border-[var(--color-border-subtle)] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[var(--color-text-primary)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface)]"
                      >
                        Use default
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
            {(copyHealth.flags.length > 0 || copyHealth.missingDetails.length > 0 || copyHealth.duplicateSignals.length > 0) && (
              <div className="mb-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-text-primary)]">Guest clarity</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
                      {copyHealth.missingDetails.length > 0
                        ? `Guests usually ask about ${copyHealth.missingDetails.slice(0, 3).join(', ')}.`
                        : copyHealth.duplicateSignals[0] ?? copyHealth.flags[0]}
                    </p>
                  </div>
                  <span className="rounded-xl border border-[var(--color-border-subtle)] bg-white px-2 py-0.5 text-[11px] font-semibold text-[var(--color-text-secondary)]">
                    {copyHealth.score}%
                  </span>
                </div>
              </div>
            )}
            {manifest.settingsSchema.fields.map(field => (
              <InspectorField
                key={field.key}
                field={field}
                value={selectedSection.settings[field.key] ?? field.defaultValue}
                onChange={val => handleUpdateSetting(field.key, val)}
                sectionId={selectedSection.id}
              />
            ))}
            {selectedSection.type === 'custom' && (
              <CustomBlockImageEditor
                sectionId={selectedSection.id}
                blocks={(selectedSection.settings.blocks ?? []) as CustomBlock[]}
              />
            )}
            {manifest.capabilities.mediaAware && selectedSection.type !== 'custom' && (
              <GalleryImageEditor
                sectionId={selectedSection.id}
                pageId={activePage.id}
                images={normalizeGalleryImages(selectedSection.settings.images)}
              />
            )}
            {manifest.settingsSchema.fields.length === 0 && selectedSection.type !== 'custom' && !manifest.capabilities.mediaAware && (
              <p className="text-xs text-[var(--color-text-tertiary)] text-center py-6">This section does not have direct text fields here.</p>
            )}
          </div>
        )}

        {activeTab === 'style' && (
          <div className="p-4 space-y-5">
            <StyleRecipePicker
              section={selectedSection}
              onChange={(styleOverrides) => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, { styleOverrides }))}
            />

            <div>
              <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] mb-3">Colors</p>
              <p className="text-[11px] text-[var(--color-text-tertiary)] mb-3">Only change these if this section needs to feel different from the rest of your site.</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-[var(--color-text-secondary)] block mb-1.5">Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedSection.styleOverrides?.backgroundColor ?? '#ffffff'}
                      onChange={e => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                        styleOverrides: { ...selectedSection.styleOverrides, backgroundColor: e.target.value },
                      }))}
                      className="w-8 h-8 rounded-xl cursor-pointer border border-[var(--color-border-subtle)] p-0.5 flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={selectedSection.styleOverrides?.backgroundColor ?? ''}
                      onChange={e => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                        styleOverrides: { ...selectedSection.styleOverrides, backgroundColor: e.target.value },
                      }))}
                      placeholder="inherit"
                      className="flex-1 border border-[var(--color-border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] font-mono bg-[var(--color-surface-subtle)] focus:bg-white transition-colors"
                    />
                    {selectedSection.styleOverrides?.backgroundColor && (
                      <button
                        onClick={() => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                          styleOverrides: { ...selectedSection.styleOverrides, backgroundColor: undefined },
                        }))}
                        title="Clear"
                        className="text-gray-300 hover:text-[var(--color-text-tertiary)] flex-shrink-0 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--color-text-secondary)] block mb-1.5">Text Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedSection.styleOverrides?.textColor ?? '#111827'}
                      onChange={e => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                        styleOverrides: { ...selectedSection.styleOverrides, textColor: e.target.value },
                      }))}
                      className="w-8 h-8 rounded-xl cursor-pointer border border-[var(--color-border-subtle)] p-0.5 flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={selectedSection.styleOverrides?.textColor ?? ''}
                      onChange={e => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                        styleOverrides: { ...selectedSection.styleOverrides, textColor: e.target.value },
                      }))}
                      placeholder="inherit"
                      className="flex-1 border border-[var(--color-border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] font-mono bg-[var(--color-surface-subtle)] focus:bg-white transition-colors"
                    />
                    {selectedSection.styleOverrides?.textColor && (
                      <button
                        onClick={() => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                          styleOverrides: { ...selectedSection.styleOverrides, textColor: undefined },
                        }))}
                        title="Clear"
                        className="text-gray-300 hover:text-[var(--color-text-tertiary)] flex-shrink-0 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] mb-3">Animation</p>
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {[
                  ['none', 'None'],
                  ['fade-in', 'Fade'],
                  ['fade-up', 'Fade Up'],
                  ['slide-up', 'Slide'],
                  ['zoom-in', 'Zoom'],
                  ['stagger', 'Stagger'],
                  ['reveal-left', 'Left'],
                  ['reveal-right', 'Right'],
                  ['blur-in', 'Blur'],
                  ['float-in', 'Float'],
                  ['scale-up', 'Scale'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                      styleOverrides: { ...selectedSection.styleOverrides, animationPreset: id as NonNullable<typeof selectedSection.styleOverrides.animationPreset> },
                    }))}
                    className={`rounded-xl px-2 py-1.5 text-[11px] font-medium transition-colors ${
                      (selectedSection.styleOverrides?.animationPreset ?? 'none') === id
                        ? 'bg-[var(--color-text-primary)] text-[var(--color-text-inverse)]'
                        : 'bg-gray-100 text-[var(--color-text-secondary)] hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-[var(--color-text-tertiary)]">Side Image</p>
                {selectedSection.styleOverrides?.sideImage && (
                  <button
                    onClick={() => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                      styleOverrides: { ...selectedSection.styleOverrides, sideImage: undefined },
                    }))}
                    className="text-[10px] text-red-400 hover:text-red-600 font-medium transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>

              {selectedSection.styleOverrides?.sideImage ? (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden border border-[var(--color-border-subtle)] aspect-video bg-gray-100 group">
                    <img
                      src={selectedSection.styleOverrides.sideImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => dispatch(builderActions.openSideImagePicker(selectedSection.id))}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium"
                    >
                      Change Image
                    </button>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[var(--color-text-secondary)] block mb-1.5">Position</label>
                    <div className="flex gap-1.5">
                      {(['left', 'right'] as const).map(pos => (
                        <button
                          key={pos}
                          onClick={() => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                            styleOverrides: { ...selectedSection.styleOverrides, sideImagePosition: pos },
                          }))}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors capitalize ${
                            (selectedSection.styleOverrides?.sideImagePosition ?? 'right') === pos
                              ? 'bg-[var(--color-text-primary)] text-[var(--color-text-inverse)]'
                              : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-subtle)]'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[var(--color-text-secondary)] block mb-1.5">Width</label>
                    <div className="flex gap-1.5">
                      {([['sm', '25%'], ['md', '40%'], ['lg', '50%']] as const).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                            styleOverrides: { ...selectedSection.styleOverrides, sideImageSize: key },
                          }))}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                            (selectedSection.styleOverrides?.sideImageSize ?? 'md') === key
                              ? 'bg-[var(--color-text-primary)] text-[var(--color-text-inverse)]'
                              : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-subtle)]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[var(--color-text-secondary)] block mb-1.5">Fit</label>
                    <div className="flex gap-1.5">
                      {(['cover', 'contain'] as const).map(fit => (
                        <button
                          key={fit}
                          onClick={() => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                            styleOverrides: { ...selectedSection.styleOverrides, sideImageFit: fit },
                          }))}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors capitalize ${
                            (selectedSection.styleOverrides?.sideImageFit ?? 'cover') === fit
                              ? 'bg-[var(--color-text-primary)] text-[var(--color-text-inverse)]'
                              : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-subtle)]'
                          }`}
                        >
                          {fit}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => dispatch(builderActions.openSideImagePicker(selectedSection.id))}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[var(--color-border-subtle)] rounded-xl p-4 text-xs text-[var(--color-text-tertiary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-subtle)] transition-all"
                >
                  <ImageIcon size={15} />
                  Add a side image
                </button>
              )}
            </div>

            {showExpert ? (
              <ExpertCssEditor
                section={selectedSection}
                onChange={(styleOverrides) => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, { styleOverrides }))}
              />
            ) : (
              <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] p-3">
                <p className="text-xs font-semibold text-[var(--color-text-primary)]">Need code-level polish?</p>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
                  Expert mode adds scoped CSS and custom class names for this section without making that the default editing experience.
                </p>
                <button
                  type="button"
                  onClick={() => setCustomizationLevel('expert')}
                  className="mt-2 rounded-xl border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]"
                >
                  Open Expert controls
                </button>
              </div>
            )}

          </div>
        )}

        {activeTab === 'layout' && (
          <div className="p-4 space-y-5">
            <div>
              <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] mb-3">Layout</p>
              <div className="relative">
                <select
                  value={selectedSection.variant}
                  onChange={e => handleChangeVariant(e.target.value)}
                  className="w-full appearance-none border border-[var(--color-border-subtle)] rounded-xl px-3 py-2 text-sm bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] pr-8 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:bg-white transition-colors"
                >
                  {manifest.variantMeta.map(v => (
                    <option key={v.id} value={v.id}>{v.label} — {v.description}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] pointer-events-none" />
              </div>
              <p className="mt-1.5 text-[11px] text-[var(--color-text-tertiary)]">Changing layout keeps your content and connected data intact.</p>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] mb-3">Spacing</p>
              <p className="text-[11px] text-[var(--color-text-tertiary)] mb-3">Use spacing sparingly. Most sections already start with balanced defaults.</p>
              <SpacingControl
                label="Padding Top"
                value={selectedSection.styleOverrides?.paddingTop ?? ''}
                onChange={val => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                  styleOverrides: { ...selectedSection.styleOverrides, paddingTop: val || undefined },
                }))}
              />
              <SpacingControl
                label="Padding Bottom"
                value={selectedSection.styleOverrides?.paddingBottom ?? ''}
                onChange={val => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                  styleOverrides: { ...selectedSection.styleOverrides, paddingBottom: val || undefined },
                }))}
              />
            </div>
          </div>
        )}

        {activeTab === 'data' && hasBindings && (
          <div className="p-4 space-y-3">
            <p className="text-xs text-[var(--color-text-tertiary)] leading-relaxed">
              This section automatically pulls from your wedding details. Update those details from your wedding home.
            </p>
            {manifest.bindingsSchema.slots.map(slot => (
              <div key={slot.key} className="p-3 bg-[var(--color-surface-subtle)] rounded-xl border border-gray-100">
                <p className="text-xs font-semibold text-[var(--color-text-primary)] mb-0.5">{slot.label}</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">Connected to <span className="font-medium text-[var(--color-text-tertiary)]">{slot.dataSource}</span></p>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};

interface InspectorFieldProps {
  field: BuilderSettingsField;
  value: unknown;
  onChange: (val: string | boolean | number) => void;
  sectionId?: string;
}

const InspectorField: React.FC<InspectorFieldProps> = ({ field, value, onChange, sectionId }) => {
  const { dispatch } = useBuilderContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stringValue = readBuilderValue(value as string | { value: string } | undefined, '');
  const canPolishCopy = field.type === 'textarea' || field.type === 'text' || !['toggle', 'select', 'color', 'image', 'number'].includes(field.type);
  const applyCopyAction = (tone: BuilderRewriteTone | 'clean') => {
    const nextValue = tone === 'clean' ? cleanBuilderCopy(stringValue) : rewriteBuilderCopy(stringValue, tone);
    onChange(nextValue);
  };
  const copyActionControls = canPolishCopy && stringValue.trim().length > 0 ? (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {([
        ['clean', 'Clean'],
        ['rewrite', 'Rewrite'],
        ['warmer', 'Make warmer'],
        ['simpler', 'Make simpler'],
        ['formal', 'Make more formal'],
        ['shorten', 'Shorten'],
      ] as const).map(([tone, label]) => (
        <button
          key={tone}
          type="button"
          onClick={() => applyCopyAction(tone)}
          className="rounded-xl border border-[var(--color-border-subtle)] bg-white px-2 py-1 text-[10px] font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
        >
          {label}
        </button>
      ))}
    </div>
  ) : null;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value]);

  switch (field.type) {
    case 'toggle':
      return (
        <div className="flex items-center justify-between py-2">
          <label className="text-sm text-[var(--color-text-primary)] font-medium">{field.label}</label>
          <button
            onClick={() => onChange(!(value as boolean))}
            className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-[var(--color-accent)]' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full ring-1 ring-[var(--color-border-subtle)] transition-transform ${value ? 'translate-x-4' : ''}`} />
          </button>
        </div>
      );

    case 'textarea':
      return (
        <div className="py-1">
          <label className="text-xs font-semibold text-[var(--color-text-tertiary)] block mb-1.5">{field.label}</label>
          <textarea
            ref={textareaRef}
            value={stringValue}
            onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="w-full border border-[var(--color-border-subtle)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none bg-[var(--color-surface-subtle)] focus:bg-white transition-colors"
          />
          {copyActionControls}
        </div>
      );

    case 'select':
      return (
        <div className="py-1">
          <label className="text-xs font-semibold text-[var(--color-text-tertiary)] block mb-1.5">{field.label}</label>
          <div className="relative">
            <select
              value={(value as string) ?? ''}
              onChange={e => onChange(e.target.value)}
              className="w-full appearance-none border border-[var(--color-border-subtle)] rounded-xl px-3 py-2.5 text-sm bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] pr-8 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:bg-white transition-colors"
            >
              {field.options?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] pointer-events-none" />
          </div>
        </div>
      );

    case 'color':
      return (
        <div className="py-1">
          <label className="text-xs font-semibold text-[var(--color-text-tertiary)] block mb-1.5">{field.label}</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={(value as string) ?? '#000000'}
              onChange={e => onChange(e.target.value)}
              className="w-9 h-9 rounded-xl cursor-pointer border border-[var(--color-border-subtle)] p-0.5"
            />
            <input
              type="text"
              value={(value as string) ?? ''}
              onChange={e => onChange(e.target.value)}
              placeholder={field.placeholder ?? 'e.g. #000000'}
              className="flex-1 border border-[var(--color-border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] font-mono bg-[var(--color-surface-subtle)]"
            />
          </div>
        </div>
      );

    case 'image':
      return (
        <div className="py-1">
          <label className="text-xs font-semibold text-[var(--color-text-tertiary)] block mb-1.5">{field.label}</label>
          {value ? (
            <div className="relative rounded-xl overflow-hidden border border-[var(--color-border-subtle)] aspect-video bg-gray-100 mb-2 group">
              <img src={value as string} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => onChange('')}
                  className="px-3 py-1.5 bg-white rounded-xl text-xs font-medium text-[var(--color-text-primary)] hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : null}
          <button
            onClick={() => dispatch(builderActions.openMediaLibrary(sectionId, field.key))}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[var(--color-border-subtle)] rounded-xl p-3 text-xs text-[var(--color-text-tertiary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-subtle)] transition-all"
          >
            <ImageIcon size={14} />
            {value ? 'Change image' : 'Choose from library'}
          </button>
        </div>
      );

    case 'number':
      return (
        <div className="py-1">
          <label className="text-xs font-semibold text-[var(--color-text-tertiary)] block mb-1.5">{field.label}</label>
          <input
            type="number"
            value={(value as number) ?? 0}
            onChange={e => onChange(Number(e.target.value))}
            className="w-full border border-[var(--color-border-subtle)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-[var(--color-surface-subtle)] focus:bg-white transition-colors"
          />
        </div>
      );

    default:
      return (
        <div className="py-1">
          <label className="text-xs font-semibold text-[var(--color-text-tertiary)] block mb-1.5">{field.label}</label>
          <input
            type="text"
            value={stringValue}
            onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-full border border-[var(--color-border-subtle)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-[var(--color-surface-subtle)] focus:bg-white transition-colors"
          />
          {copyActionControls}
        </div>
      );
  }
};

interface GalleryImage {
  id: string;
  url: string;
  alt: string;
  caption: string;
}

export function normalizeGalleryImages(value: unknown): GalleryImage[] {
  const unwrapped = readBuilderValue<unknown>(value, []);
  return Array.isArray(unwrapped) ? unwrapped as GalleryImage[] : [];
}

const GalleryImageEditor: React.FC<{ sectionId: string; pageId: string; images: GalleryImage[] }> = ({ sectionId, pageId, images }) => {
  const { state, dispatch } = useBuilderContext();

  const currentSettings = () => {
    const page = state.project?.pages.find(p => p.id === pageId);
    return page?.sections.find(s => s.id === sectionId)?.settings ?? {};
  };

  const handleUpdateImage = (index: number, patch: Partial<GalleryImage>) => {
    const updated = images.map((img, i) => i === index ? { ...img, ...patch } : img);
    dispatch(builderActions.updateSection(pageId, sectionId, {
      settings: { ...currentSettings(), images: markFieldAsUserEdited(updated) },
    }));
  };

  const handleRemoveImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    dispatch(builderActions.updateSection(pageId, sectionId, {
      settings: { ...currentSettings(), images: markFieldAsUserEdited(updated) },
    }));
  };

  const handleAddImage = () => {
    const newImg: GalleryImage = { id: String(Date.now()), url: '', alt: '', caption: '' };
    const updated = [...images, newImg];
    dispatch(builderActions.updateSection(pageId, sectionId, {
      settings: { ...currentSettings(), images: markFieldAsUserEdited(updated) },
    }));
    dispatch(builderActions.openImageArrayPicker(sectionId, updated.length - 1));
  };

  return (
    <div className="pt-2 border-t border-gray-100 mt-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold text-[var(--color-text-tertiary)]">Photos ({images.length})</p>
        <button
          onClick={handleAddImage}
          className="flex items-center gap-1 text-xs text-[var(--color-accent)] hover:text-[var(--color-text-primary)] font-medium transition-colors"
        >
          <Plus size={12} />
          Add photo
        </button>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto pr-0.5">
        {images.map((img, i) => (
          <div key={img.id} className="group border border-gray-100 rounded-xl overflow-hidden bg-[var(--color-surface-subtle)] hover:border-[var(--color-border-subtle)] transition-colors">
            <div className="relative aspect-video bg-gray-200">
              {img.url ? (
                <img src={readBuilderValue(img.url as string | { value: string }, '')} alt={readBuilderValue(img.alt as string | { value: string }, '')} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon size={20} className="text-gray-300" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => dispatch(builderActions.openImageArrayPicker(sectionId, i))}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-white rounded-xl text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-accent)] transition-colors"
                >
                  <Image size={12} />
                  Change
                </button>
                <button
                  onClick={() => handleRemoveImage(i)}
                  className="p-1.5 bg-white rounded-xl text-[var(--color-text-tertiary)] hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="absolute top-1.5 left-1.5 w-5 h-5 bg-black/50 rounded text-white text-[9px] font-bold flex items-center justify-center">
                {i + 1}
              </div>
            </div>
            <div className="p-2 space-y-1.5">
              <input
                type="text"
                value={readBuilderValue(img.alt as string | { value: string } | undefined, '')}
                onChange={e => handleUpdateImage(i, { alt: markFieldAsUserEdited(e.target.value) as unknown as string })}
                placeholder="Describe the image"
                className="w-full border border-[var(--color-border-subtle)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-white transition-colors"
              />
              <input
                type="text"
                value={readBuilderValue(img.caption as string | { value: string } | undefined, '')}
                onChange={e => handleUpdateImage(i, { caption: markFieldAsUserEdited(e.target.value) as unknown as string })}
                placeholder="Caption (optional)"
                className="w-full border border-[var(--color-border-subtle)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-white transition-colors"
              />
            </div>
          </div>
        ))}
        {images.length === 0 && (
          <button
            onClick={handleAddImage}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[var(--color-border-subtle)] rounded-xl p-4 text-xs text-[var(--color-text-tertiary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-subtle)] transition-all"
          >
            <Plus size={14} />
            Add first photo
          </button>
        )}
      </div>
    </div>
  );
};

type BlockPath = { blockId: string; columnIndex?: number; columnBlockId?: string };

function collectImageBlocks(blocks: CustomBlock[]): Array<{ block: CustomBlock; path: BlockPath; label: string }> {
  const results: Array<{ block: CustomBlock; path: BlockPath; label: string }> = [];
  blocks.forEach((block) => {
    if (block.type === 'image') {
      results.push({ block, path: { blockId: block.id }, label: `Image ${results.length + 1}` });
    }
    if (block.type === 'columns' && block.columns) {
      block.columns.forEach((col, ci) => {
        col.forEach(cb => {
          if (cb.type === 'image') {
            results.push({
              block: cb,
              path: { blockId: block.id, columnIndex: ci, columnBlockId: cb.id },
              label: `Image ${results.length + 1}`,
            });
          }
        });
      });
    }
  });
  return results;
}

const CustomBlockImageEditor: React.FC<{ sectionId: string; blocks: CustomBlock[] }> = ({ sectionId, blocks }) => {
  const { state, dispatch } = useBuilderContext();
  const imageBlocks = collectImageBlocks(blocks);

  if (imageBlocks.length === 0) return null;

  return (
    <div className="pt-2">
      <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] mb-3">Images</p>
      <div className="space-y-3">
        {imageBlocks.map(({ block, path, label }) => (
          <div key={`${path.blockId}-${path.columnBlockId ?? ''}`} className="space-y-1.5">
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</p>
            {block.imageUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-[var(--color-border-subtle)] aspect-video bg-gray-100 group">
                <img src={readBuilderValue(block.imageUrl as string | { value: string } | undefined, '')} alt={readBuilderValue(block.imageAlt as string | { value: string } | undefined, '')} className="w-full h-full object-cover" />
                <button
                  onClick={() => dispatch(builderActions.openCustomBlockImagePicker(sectionId, path))}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1.5"
                >
                  <Image size={13} />
                  Change Image
                </button>
              </div>
            ) : (
              <button
                onClick={() => dispatch(builderActions.openCustomBlockImagePicker(sectionId, path))}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[var(--color-border-subtle)] rounded-xl p-3 text-xs text-[var(--color-text-tertiary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-subtle)] transition-all"
              >
                <ImageIcon size={14} />
                Choose image
              </button>
            )}
            <input
              type="text"
              value={readBuilderValue(block.imageAlt as string | { value: string } | undefined, '')}
              onChange={e => {
                if (!state.activePageId) return;
                dispatch(builderActions.updateCustomBlock(
                  state.activePageId,
                  sectionId,
                  path.blockId,
                  { imageAlt: markFieldAsUserEdited(e.target.value) },
                  path.columnIndex,
                  path.columnBlockId
                ));
              }}
              placeholder="Describe the image (optional)"
              className="w-full border border-[var(--color-border-subtle)] rounded-xl px-3 py-1.5 text-xs text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-[var(--color-surface-subtle)] focus:bg-white transition-colors"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const StyleRecipePicker: React.FC<{
  section: BuilderSectionInstance;
  onChange: (styleOverrides: BuilderSectionInstance['styleOverrides']) => void;
}> = ({ section, onChange }) => {
  const overrides = section.styleOverrides ?? {};
  const activeRecipeId = overrides.styleRecipeId;

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold text-[var(--color-text-tertiary)]">Style recipes</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-text-tertiary)]">
            One-click polish for couples who want a premium feel without writing CSS.
          </p>
        </div>
        {activeRecipeId && (
          <button
            type="button"
            onClick={() => onChange(clearBuilderStyleRecipe(overrides))}
            className="shrink-0 rounded-xl border border-[var(--color-border-subtle)] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
          >
            Reset
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {BUILDER_STYLE_RECIPES.map((recipe) => {
          const active = activeRecipeId === recipe.id;
          return (
            <button
              key={recipe.id}
              type="button"
              onClick={() => onChange(applyBuilderStyleRecipe(overrides, recipe.id as BuilderStyleRecipeId))}
              className={`rounded-xl border p-3 text-left transition-colors ${
                active
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                  : 'border-[var(--color-border-subtle)] bg-white hover:border-[var(--color-border)] hover:bg-[var(--color-surface-subtle)]'
              }`}
            >
              <div className="mb-2 flex gap-1">
                <span className="h-4 w-4 rounded-xl border border-black/10" style={{ backgroundColor: recipe.backgroundColor }} />
                <span className="h-4 w-4 rounded-xl border border-black/10" style={{ backgroundColor: recipe.textColor }} />
              </div>
              <p className="text-xs font-semibold text-[var(--color-text-primary)]">{recipe.label}</p>
              <p className="mt-1 text-[10px] leading-snug text-[var(--color-text-tertiary)]">{recipe.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ExpertCssEditor: React.FC<{
  section: BuilderSectionInstance;
  onChange: (styleOverrides: BuilderSectionInstance['styleOverrides']) => void;
}> = ({ section, onChange }) => {
  const overrides = section.styleOverrides ?? {};
  const cssValue = overrides.customCss ?? '';
  const classValue = overrides.customClassName ?? '';

  const update = (patch: Partial<BuilderSectionInstance['styleOverrides']>) => {
    onChange({ ...overrides, ...patch });
  };

  return (
    <div className="border-t border-gray-100 pt-4">
      <div className="mb-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] p-3">
        <p className="text-xs font-semibold text-[var(--color-text-primary)]">Expert CSS</p>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
          CSS here is scoped to this section. Use regular declarations for the section root, or use selectors like h2 and .button. Use & when you want the section root itself.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Custom class names</label>
          <input
            type="text"
            value={classValue}
            onChange={(event) => update({ customClassName: sanitizeCustomClassName(event.target.value) || undefined })}
            placeholder="luxury-hero featured-section"
            className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-3 py-2 text-xs font-mono text-[var(--color-text-primary)] transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">Scoped CSS</label>
          <textarea
            value={cssValue}
            onChange={(event) => update({ customCss: sanitizeBuilderCustomCss(event.target.value) || undefined })}
            rows={8}
            placeholder={'border-radius: 28px;\noverflow: hidden;\n\nh2 { font-size: clamp(2.5rem, 7vw, 6rem); }\n& { box-shadow: 0 24px 80px rgba(15, 23, 42, 0.12); }'}
            className="w-full resize-y rounded-xl border border-[var(--color-border-subtle)] bg-slate-950 px-3 py-2 text-xs font-mono leading-relaxed text-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
          <p className="mt-1.5 text-[10px] text-[var(--color-text-tertiary)]">
            Unsafe imports and script-like values are removed before rendering.
          </p>
        </div>

        {(cssValue || classValue) && (
          <button
            type="button"
            onClick={() => update({ customCss: undefined, customClassName: undefined })}
            className="rounded-xl border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Reset Expert CSS
          </button>
        )}
      </div>
    </div>
  );
};

const SPACING_PRESETS = [
  { label: 'None', value: '0px' },
  { label: 'S', value: '2rem' },
  { label: 'M', value: '4rem' },
  { label: 'L', value: '6rem' },
  { label: 'XL', value: '10rem' },
];

const SpacingControl: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
}> = ({ label, value, onChange }) => {
  const activePreset = SPACING_PRESETS.find(p => p.value === value);

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</label>
        {value && (
          <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">{value}</span>
        )}
      </div>
      <div className="flex gap-1 mb-2">
        {SPACING_PRESETS.map(preset => (
          <button
            key={preset.value}
            onClick={() => onChange(preset.value === value ? '' : preset.value)}
            className={`flex-1 py-1.5 rounded-xl text-[11px] font-medium transition-colors ${
              activePreset?.value === preset.value
                ? 'bg-[var(--color-text-primary)] text-[var(--color-text-inverse)]'
                : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-subtle)]'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="e.g. 4rem, 64px, 10%"
        className="w-full border border-[var(--color-border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] font-mono bg-[var(--color-surface-subtle)] focus:bg-white transition-colors"
      />
    </div>
  );
};
