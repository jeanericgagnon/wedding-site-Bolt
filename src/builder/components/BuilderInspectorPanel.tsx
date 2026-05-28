import React, { useRef, useEffect } from 'react';
import { X, ChevronDown, ImageIcon, Eye, EyeOff, Pencil, Palette, Database, Image, Plus, Trash2, Compass, Ruler } from 'lucide-react';
import { useBuilderContext } from '../state/builderStore';
import { builderActions } from '../state/builderActions';
import { markFieldAsUserEdited, readBuilderValue } from '../../lib/weddingProfile';
import { selectSelectedSection, selectActivePage, selectActivePageSections } from '../state/builderSelectors';
import { getSectionManifest } from '../registry/sectionManifests';
import { getVariantPreviewSource } from '../registry/variantPreviewSource';
import { BuilderSectionRail } from './BuilderSectionRail';
import { BuilderSettingsField } from '../../types/builder/section';
import { CustomBlock } from '../../sections/variants/custom/skeletons';
import { BuilderSectionType } from '../../types/builder/section';
import { getBuilderPageEditingSummary } from './builderPageEditingSummary';
import { getBuilderSectionEditingGuidance } from './builderSectionEditingGuidance';
import { getBuilderInspectorTabGuidance } from './builderInspectorTabGuidance';
import { runBuilderPageEditingAction } from './builderPageEditingActions';

type InspectorTab = 'guide' | 'content' | 'style' | 'layout' | 'data';

export const BuilderInspectorPanel: React.FC = () => {
  const { state, dispatch } = useBuilderContext();
  const [activeTab, setActiveTab] = React.useState<InspectorTab>('content');
  const [simpleMode, setSimpleMode] = React.useState(true);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [showVariantPicker, setShowVariantPicker] = React.useState(false);
  const selectedSection = selectSelectedSection(state);
  const activePage = selectActivePage(state);
  const activeSections = selectActivePageSections(state);

  useEffect(() => {
    if (selectedSection) setActiveTab('content');
  }, [selectedSection]);

  useEffect(() => {
    if (simpleMode && (activeTab === 'style' || activeTab === 'data' || activeTab === 'guide')) {
      setActiveTab('content');
    }
  }, [simpleMode, activeTab]);

  const selectedIndex = activeSections.findIndex((s) => s.id === state.selectedSectionId);
  const previousSection = selectedIndex > 0 ? activeSections[selectedIndex - 1] : null;
  const nextSectionInRail = selectedIndex >= 0 && selectedIndex < activeSections.length - 1 ? activeSections[selectedIndex + 1] : null;
  const pageEditingSummary = activePage ? getBuilderPageEditingSummary(activePage.title, activeSections) : null;

  const quickSectionRail = activePage ? (
    <BuilderSectionRail
      activePageId={activePage.id}
      activeSections={activeSections.map((section) => ({
        id: section.id,
        type: section.type,
        enabled: section.enabled,
        locked: section.locked,
      }))}
      selectedSectionId={state.selectedSectionId}
      onSelectSection={(sectionId) => dispatch(builderActions.selectSection(sectionId))}
      onAddSection={(type, variantId) => dispatch(builderActions.addSectionByType(activePage.id, type as BuilderSectionType, undefined, variantId))}
      onReorderSections={(orderedIds) => dispatch(builderActions.reorderSections(activePage.id, orderedIds))}
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
          <div className="max-w-sm rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-5 py-7">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Choose a page to keep editing</p>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              The inspector will switch from page guidance to section controls as soon as you pick a page and start shaping it.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  const handlePageSummaryAction = (kind: 'primary' | 'secondary') => {
    if (!activePage || !pageEditingSummary) return;
    const action = kind === 'primary' ? pageEditingSummary.primaryAction : pageEditingSummary.secondaryAction;
    runBuilderPageEditingAction({ action, activePageId: activePage.id, dispatch });
  };

  if (!selectedSection) {
    return (
      <aside className="w-full lg:w-[520px] bg-white border-t lg:border-t-0 lg:border-l border-neutral-200 flex flex-col h-full overflow-hidden">
        {pageEditingSummary && (
          <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4 py-4 space-y-4">
            <div>
              <h3 className="text-[22px] font-semibold text-[var(--color-text-primary)]">{activePage.title}</h3>
              <p className="mt-1 text-[14px] text-[var(--color-text-secondary)]">Choose the right next move for this page before you dive into a single section.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] text-[var(--color-text-secondary)]">
              <span className="rounded-full border border-[var(--color-border-subtle)] bg-white px-2 py-1 font-medium">
                {pageEditingSummary.totalCount} sections
              </span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                {pageEditingSummary.visibleCount} visible
              </span>
              {pageEditingSummary.hiddenCount > 0 && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 font-medium text-amber-700">
                  {pageEditingSummary.hiddenCount} hidden
                </span>
              )}
              {pageEditingSummary.lockedCount > 0 && (
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-1 font-medium text-slate-700">
                  {pageEditingSummary.lockedCount} locked
                </span>
              )}
              {pageEditingSummary.customCount > 0 && (
                <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-1 font-medium text-violet-700">
                  {pageEditingSummary.customCount} custom
                </span>
              )}
            </div>
            {pageEditingSummary.missingEssentialLabels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pageEditingSummary.missingEssentialLabels.map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-800"
                  >
                    Missing {label}
                  </span>
                ))}
              </div>
            )}
            <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-900">Main focus</p>
              <p className="mt-1 text-sm font-medium text-sky-950">{pageEditingSummary.focusTitle}</p>
              <p className="mt-1 text-xs text-sky-800">{pageEditingSummary.focusDetail}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">Best next move</p>
              <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">{pageEditingSummary.bestNextMove}</p>
              <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                <span className="font-semibold text-[var(--color-text-primary)]">Decision rule:</span> {pageEditingSummary.decisionRule}
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                <span className="font-semibold text-[var(--color-text-primary)]">Watchout:</span> {pageEditingSummary.watchout}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handlePageSummaryAction('primary')}
                  className="rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-[var(--color-text-inverse)] hover:bg-[var(--color-accent-hover)]"
                >
                  {pageEditingSummary.primaryAction.label}
                </button>
                <button
                  type="button"
                  onClick={() => handlePageSummaryAction('secondary')}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]"
                >
                  {pageEditingSummary.secondaryAction.label}
                </button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { label: 'Current', detail: pageEditingSummary.currentStep },
                { label: 'Next', detail: pageEditingSummary.nextStep },
                { label: 'Then', detail: pageEditingSummary.thenStep },
              ].map((step) => (
                <div
                  key={step.label}
                  className="rounded-xl border border-[var(--color-border-subtle)] bg-white px-3 py-3"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">{step.label}</p>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {quickSectionRail}
      </aside>
    );
  }

  const manifest = getSectionManifest(selectedSection.type);
  const hasBindings = manifest.capabilities.hasBindings && manifest.bindingsSchema.slots.length > 0;
  const hasContentControls = manifest.settingsSchema.fields.length > 0 || selectedSection.type === 'custom' || manifest.capabilities.mediaAware;

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

  const sectionEditingGuidance = getBuilderSectionEditingGuidance({
    sectionLabel: manifest.label,
    hasMeaningfulContent,
    hasStyleOverrides,
    hasLayoutCustomization,
    hasBindings,
    dataConfigured,
    enabled: selectedSection.enabled,
  });
  const tabGuidance = getBuilderInspectorTabGuidance({
    sectionLabel: manifest.label,
    hasContentControls,
    hasMeaningfulContent,
    hasStyleOverrides,
    hasLayoutCustomization,
    hasBindings,
    dataConfigured,
    enabled: selectedSection.enabled,
    recommendedTab: sectionEditingGuidance.nextActionTab,
  });
  const activeTabGuidance = tabGuidance.find((item) => item.id === activeTab) ?? null;

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

  const handleJumpToSection = (sectionId: string) => {
    dispatch(builderActions.selectSection(sectionId));
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-section-id="${sectionId}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
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
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-[13px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]"
            >
            Change section layout
            </button>
        </div>
        <div className="px-4 py-1.5 flex items-center justify-between text-[11px] text-[var(--color-text-tertiary)]">
          <span>Mode: {simpleMode ? 'Basic' : 'Advanced'}</span>
          <button
            type="button"
            onClick={() => {
              if (simpleMode) {
                setSimpleMode(false);
                setShowAdvanced(true);
              } else {
                setSimpleMode(true);
                setShowAdvanced(false);
                if (activeTab === 'style' || activeTab === 'data' || activeTab === 'guide') setActiveTab('content');
              }
            }}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            {simpleMode ? 'Show more controls' : 'Show fewer controls'}
          </button>
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
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-text-secondary)]">
          <span className="rounded-full border border-[var(--color-border-subtle)] bg-white px-2 py-1 font-medium">
            Section {selectedIndex + 1} of {activeSections.length}
          </span>
          <span className={`rounded-full border px-2 py-1 font-medium ${selectedSection.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
            {selectedSection.enabled ? 'Visible on site' : 'Hidden from site'}
          </span>
          <button
            type="button"
            onClick={handleToggleVisibility}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-subtle)] bg-white px-2 py-1 font-medium text-[var(--color-text-primary)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-subtle)]"
          >
            {selectedSection.enabled ? <EyeOff size={12} /> : <Eye size={12} />}
            {selectedSection.enabled ? 'Hide section' : 'Show section'}
          </button>
        </div>
        <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-900">Main focus</p>
              <p className="mt-1 text-sm font-medium text-sky-950">{sectionEditingGuidance.focusTitle}</p>
              <p className="mt-1 text-[11px] text-sky-800">{sectionEditingGuidance.focusDetail}</p>
            </div>
            <div className="rounded-full border border-sky-200 bg-white px-2 py-1 text-[11px] font-medium text-sky-900">
              {sectionEditingGuidance.progressPercent}%
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-sky-200 bg-white px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">Best next move</p>
            <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">{sectionEditingGuidance.bestNextMove}</p>
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
              <span className="font-semibold text-[var(--color-text-primary)]">Decision rule:</span> {sectionEditingGuidance.decisionRule}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              <span className="font-semibold text-[var(--color-text-primary)]">Watchout:</span> {sectionEditingGuidance.watchout}
            </p>
          </div>
          <button
            onClick={() => {
              if (sectionEditingGuidance.nextActionTab !== 'content' && sectionEditingGuidance.nextActionTab !== 'guide') {
                setShowAdvanced(true);
                setSimpleMode(false);
              }
              setActiveTab(sectionEditingGuidance.nextActionTab);
            }}
            className="mt-2 inline-flex items-center rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-sky-900 hover:bg-sky-100"
          >
            {sectionEditingGuidance.nextActionLabel}
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={!previousSection}
            onClick={() => previousSection && handleJumpToSection(previousSection.id)}
            className="rounded-lg border border-[var(--color-border-subtle)] bg-white px-3 py-2 text-left text-[11px] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border)] hover:bg-[var(--color-surface-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <p className="font-semibold text-[var(--color-text-primary)]">Previous section</p>
            <p className="mt-0.5 truncate">{previousSection ? getSectionManifest(previousSection.type).label : 'This is the first section'}</p>
          </button>
          <button
            type="button"
            disabled={!nextSectionInRail}
            onClick={() => nextSectionInRail && handleJumpToSection(nextSectionInRail.id)}
            className="rounded-lg border border-[var(--color-border-subtle)] bg-white px-3 py-2 text-left text-[11px] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border)] hover:bg-[var(--color-surface-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <p className="font-semibold text-[var(--color-text-primary)]">Next section</p>
            <p className="mt-0.5 truncate">{nextSectionInRail ? getSectionManifest(nextSectionInRail.type).label : 'This is the last section'}</p>
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {tabGuidance.filter((item) => item.show).map((item) => {
            const statusClass = item.status === 'done'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : item.status === 'recommended'
                ? 'border-sky-200 bg-sky-50 text-sky-900'
                : item.status === 'optional'
                  ? 'border-slate-200 bg-slate-50 text-slate-700'
                  : item.status === 'blocked'
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-[var(--color-border-subtle)] bg-white text-[var(--color-text-primary)]';

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id !== 'content') {
                    setShowAdvanced(true);
                    setSimpleMode(false);
                  }
                  setActiveTab(item.id);
                }}
                className={`rounded-xl border px-3 py-3 text-left transition-colors hover:border-[var(--color-border)] hover:bg-[var(--color-surface-subtle)] ${statusClass}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{item.label}</p>
                  <span className="rounded-full border border-current/15 bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
                    {item.badge}
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium">{item.summary}</p>
                <p className="mt-1 text-[11px] opacity-80">{item.detail}</p>
              </button>
            );
          })}
        </div>
      </div>

      {!simpleMode && (
        <div className="px-3 py-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
          <div className="flex items-center flex-wrap gap-1">
            {visibleTabs.map(tab => {
              const tabState = tab.id === 'guide' ? null : tabGuidance.find((item) => item.id === tab.id);
              const badgeClass = !tabState
                ? 'border-[var(--color-border-subtle)] bg-white text-[var(--color-text-tertiary)]'
                : tabState.status === 'done'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : tabState.status === 'recommended'
                    ? 'border-sky-200 bg-sky-50 text-sky-800'
                    : tabState.status === 'optional'
                      ? 'border-slate-200 bg-slate-100 text-slate-600'
                      : tabState.status === 'blocked'
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-[var(--color-border-subtle)] bg-white text-[var(--color-text-tertiary)]';

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-md border transition-colors ${
                    activeTab === tab.id
                      ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-light)]'
                      : 'border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
                  }`}
                >
                  <tab.icon size={12} />
                  {tab.label}
                  {tabState && (
                    <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${badgeClass}`}>
                      {tabState.badge}
                    </span>
                  )}
                </button>
              );
            })}
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
          <div className="grid grid-cols-2 gap-2">
            {manifest.variantMeta.map((v) => {
              const active = selectedSection.variant === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleChangeVariant(v.id)}
                  className={`text-left rounded-lg border px-2.5 py-2 ${active ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]' : 'border-[var(--color-border-subtle)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-subtle)]'}`}
                >
                  <div className="mb-2 h-20 overflow-hidden rounded-md border border-[var(--color-border-subtle)] bg-white">
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
                  <p className="text-xs font-medium text-[var(--color-text-primary)]">{v.label}</p>
                  <p className="text-[10px] text-[var(--color-text-tertiary)] line-clamp-2">{v.description || 'Layout option'}</p>
                  <p className="text-[10px] text-[var(--color-primary)] mt-1 font-medium">Use this layout</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {activeTabGuidance && activeTab !== 'guide' && (
          <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4 py-3">
            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">{activeTabGuidance.label} lane</p>
                  <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">{activeTabGuidance.summary}</p>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{activeTabGuidance.detail}</p>
                </div>
                <span className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
                  {activeTabGuidance.badge}
                </span>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'guide' && (
          <div className="p-4 space-y-4">
            <div className="rounded-xl border border-sky-100 bg-sky-50 p-3">
              <p className="text-xs font-semibold text-sky-900 mb-1">Quick guide</p>
              <p className="text-[11px] text-sky-800">Use these focused views to make edits faster without digging through every control.</p>
              <div className="mt-2">
                <div className="h-1.5 rounded-full bg-sky-100 overflow-hidden">
                  <div className="h-full bg-sky-500" style={{ width: `${guideProgress}%` }} />
                </div>
                <p className="mt-1 text-[10px] text-sky-900">Section setup progress: {guideProgress}%</p>
              </div>
            </div>

            <div className="space-y-1.5">
              {guideSteps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => !step.optional && setActiveTab(step.id === 'visibility' ? 'layout' : (step.id as InspectorTab))}
                  disabled={step.optional}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors ${step.done ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-[var(--color-border-subtle)] bg-white text-[var(--color-text-primary)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-primary)]'} ${step.optional ? 'opacity-60 cursor-default' : ''}`}
                >
                  <span className="font-medium">{step.label}</span>
                  <span className="ml-2 text-[10px]">{step.optional ? 'optional' : step.done ? 'done' : 'next'}</span>
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-white p-3">
              <p className="text-xs font-semibold text-[var(--color-text-primary)] mb-1">Best next step</p>
              <p className="text-[11px] text-[var(--color-text-secondary)]">{sectionEditingGuidance.nextActionDetail}</p>
              <button
                onClick={() => {
                  if (sectionEditingGuidance.nextActionTab !== 'content' && sectionEditingGuidance.nextActionTab !== 'guide') {
                    setShowAdvanced(true);
                    setSimpleMode(false);
                  }
                  setActiveTab(sectionEditingGuidance.nextActionTab);
                }}
                className="mt-3 inline-flex items-center rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-3 py-2 text-xs font-medium text-[var(--color-text-primary)] hover:border-[var(--color-border)] hover:bg-white"
              >
                {sectionEditingGuidance.nextActionLabel}
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
                      setShowAdvanced(true);
                      setSimpleMode(false);
                    }
                    setActiveTab(view.id as InspectorTab);
                  }}
                  className="rounded-lg border border-[var(--color-border-subtle)] bg-white px-3 py-2 text-xs font-medium text-[var(--color-text-primary)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-primary)] transition-colors"
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
                  className="rounded-full border border-[var(--color-border-subtle)] bg-white px-2 py-1 text-[10px] font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:text-[var(--color-text-primary)]"
                >
                  Check desktop
                </button>
                <button
                  onClick={() => dispatch(builderActions.setPreviewViewport('tablet'))}
                  className="rounded-full border border-[var(--color-border-subtle)] bg-white px-2 py-1 text-[10px] font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:text-[var(--color-text-primary)]"
                >
                  Check tablet
                </button>
                <button
                  onClick={() => dispatch(builderActions.setPreviewViewport('mobile'))}
                  className="rounded-full border border-[var(--color-border-subtle)] bg-white px-2 py-1 text-[10px] font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-border)] hover:text-[var(--color-text-primary)]"
                >
                  Check mobile
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="p-4 space-y-1">
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
                images={(selectedSection.settings.images ?? []) as GalleryImage[]}
              />
            )}
            {manifest.settingsSchema.fields.length === 0 && selectedSection.type !== 'custom' && !manifest.capabilities.mediaAware && (
              <p className="text-xs text-[var(--color-text-tertiary)] text-center py-6">This section does not have direct text fields here.</p>
            )}
          </div>
        )}

        {activeTab === 'style' && (
          <div className="p-4 space-y-5">
            <div>
              <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-widest mb-3">Colors</p>
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
                      className="w-8 h-8 rounded-md cursor-pointer border border-[var(--color-border-subtle)] p-0.5 flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={selectedSection.styleOverrides?.backgroundColor ?? ''}
                      onChange={e => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                        styleOverrides: { ...selectedSection.styleOverrides, backgroundColor: e.target.value },
                      }))}
                      placeholder="inherit"
                      className="flex-1 border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] font-mono bg-[var(--color-surface-subtle)] focus:bg-white transition-colors"
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
                      className="w-8 h-8 rounded-md cursor-pointer border border-[var(--color-border-subtle)] p-0.5 flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={selectedSection.styleOverrides?.textColor ?? ''}
                      onChange={e => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                        styleOverrides: { ...selectedSection.styleOverrides, textColor: e.target.value },
                      }))}
                      placeholder="inherit"
                      className="flex-1 border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] font-mono bg-[var(--color-surface-subtle)] focus:bg-white transition-colors"
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
              <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-widest mb-3">Animation</p>
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {[
                  ['none', 'None'],
                  ['fade-in', 'Fade'],
                  ['fade-up', 'Fade Up'],
                  ['slide-up', 'Slide'],
                  ['zoom-in', 'Zoom'],
                  ['stagger', 'Stagger'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                      styleOverrides: { ...selectedSection.styleOverrides, animationPreset: id as 'none' | 'fade-in' | 'fade-up' | 'slide-up' | 'zoom-in' | 'stagger' },
                    }))}
                    className={`rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
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
                <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-widest">Side Image</p>
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
                          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
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
                          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
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
                          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
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
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[var(--color-border-subtle)] rounded-xl p-4 text-xs text-[var(--color-text-tertiary)] hover:border-rose-300 hover:text-rose-500 hover:bg-[var(--color-surface-subtle)] transition-all"
                >
                  <ImageIcon size={15} />
                  Add a side image
                </button>
              )}
            </div>

          </div>
        )}

        {activeTab === 'layout' && (
          <div className="p-4 space-y-5">
            <div>
              <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-widest mb-3">Layout</p>
              <div className="relative">
                <select
                  value={selectedSection.variant}
                  onChange={e => handleChangeVariant(e.target.value)}
                  className="w-full appearance-none border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-sm bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] pr-8 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:bg-white transition-colors"
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
              <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-widest mb-3">Spacing</p>
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
              This section automatically pulls from your wedding details. Update the source information from the dashboard.
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
            className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-rose-500' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${value ? 'translate-x-4' : ''}`} />
          </button>
        </div>
      );

    case 'textarea':
      return (
        <div className="py-1">
          <label className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider block mb-1.5">{field.label}</label>
          <textarea
            ref={textareaRef}
            value={(value as string) ?? ''}
            onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="w-full border border-[var(--color-border-subtle)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none bg-[var(--color-surface-subtle)] focus:bg-white transition-colors"
          />
        </div>
      );

    case 'select':
      return (
        <div className="py-1">
          <label className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider block mb-1.5">{field.label}</label>
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
          <label className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider block mb-1.5">{field.label}</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={(value as string) ?? '#000000'}
              onChange={e => onChange(e.target.value)}
              className="w-9 h-9 rounded-lg cursor-pointer border border-[var(--color-border-subtle)] p-0.5"
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
          <label className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider block mb-1.5">{field.label}</label>
          {value ? (
            <div className="relative rounded-xl overflow-hidden border border-[var(--color-border-subtle)] aspect-video bg-gray-100 mb-2 group">
              <img src={value as string} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => onChange('')}
                  className="px-3 py-1.5 bg-white rounded-lg text-xs font-medium text-[var(--color-text-primary)] hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : null}
          <button
            onClick={() => dispatch(builderActions.openMediaLibrary(sectionId, field.key))}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[var(--color-border-subtle)] rounded-xl p-3 text-xs text-[var(--color-text-tertiary)] hover:border-rose-300 hover:text-rose-500 hover:bg-[var(--color-surface-subtle)] transition-all"
          >
            <ImageIcon size={14} />
            {value ? 'Change image' : 'Choose from library'}
          </button>
        </div>
      );

    case 'number':
      return (
        <div className="py-1">
          <label className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider block mb-1.5">{field.label}</label>
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
          <label className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider block mb-1.5">{field.label}</label>
          <input
            type="text"
            value={(value as string) ?? ''}
            onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-full border border-[var(--color-border-subtle)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-[var(--color-surface-subtle)] focus:bg-white transition-colors"
          />
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
        <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-widest">Photos ({images.length})</p>
        <button
          onClick={handleAddImage}
          className="flex items-center gap-1 text-xs text-rose-500 hover:text-[var(--color-text-primary)] font-medium transition-colors"
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
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-white rounded-lg text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)] hover:text-rose-600 transition-colors"
                >
                  <Image size={12} />
                  Change
                </button>
                <button
                  onClick={() => handleRemoveImage(i)}
                  className="p-1.5 bg-white rounded-lg text-[var(--color-text-tertiary)] hover:bg-red-50 hover:text-red-600 transition-colors"
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
                className="w-full border border-[var(--color-border-subtle)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-white transition-colors"
              />
              <input
                type="text"
                value={readBuilderValue(img.caption as string | { value: string } | undefined, '')}
                onChange={e => handleUpdateImage(i, { caption: markFieldAsUserEdited(e.target.value) as unknown as string })}
                placeholder="Caption (optional)"
                className="w-full border border-[var(--color-border-subtle)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-white transition-colors"
              />
            </div>
          </div>
        ))}
        {images.length === 0 && (
          <button
            onClick={handleAddImage}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[var(--color-border-subtle)] rounded-xl p-4 text-xs text-[var(--color-text-tertiary)] hover:border-rose-300 hover:text-rose-500 hover:bg-[var(--color-surface-subtle)] transition-all"
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
      <p className="text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-widest mb-3">Images</p>
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
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[var(--color-border-subtle)] rounded-xl p-3 text-xs text-[var(--color-text-tertiary)] hover:border-rose-300 hover:text-rose-500 hover:bg-[var(--color-surface-subtle)] transition-all"
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
              className="w-full border border-[var(--color-border-subtle)] rounded-lg px-3 py-1.5 text-xs text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-[var(--color-surface-subtle)] focus:bg-white transition-colors"
            />
          </div>
        ))}
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
            className={`flex-1 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
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
        className="w-full border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] font-mono bg-[var(--color-surface-subtle)] focus:bg-white transition-colors"
      />
    </div>
  );
};
