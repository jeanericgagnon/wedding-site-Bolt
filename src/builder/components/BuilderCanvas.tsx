import React, { useCallback, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useBuilderContext } from '../state/builderStore';
import { builderActions } from '../state/builderActions';
import {
  selectActivePage,
  selectActivePageSections,
  selectIsPreviewMode,
  selectPreviewViewport,
} from '../state/builderSelectors';
import { BuilderDropZone } from './BuilderDropZone';
import { SectionRenderer } from './SectionRenderer';
import { BuilderSectionInstance } from '../../types/builder/section';
import { getSectionManifest } from '../registry/sectionManifests';
import { createEmptyWeddingData } from '../../types/weddingData';
import { injectThemeStyle, removeThemeStyle } from '../../lib/themeInjector';
import { getFlowStatusLabel } from '../../lib/flowLabels';
import { getBuilderPageEditingSummary } from './builderPageEditingSummary';
import { getBuilderCanvasEmptyState } from './builderCanvasEmptyState';
import { getPublishIssue } from '../utils/publishReadiness';
import { getPublishBlockerUiState } from './builderTopBarModel';
import { getBuilderPreviewReviewSummary } from './builderPreviewReviewSummary';

const THEME_STYLE_ID = 'builder-canvas-theme';
const CANVAS_SCOPE = '.builder-themed-canvas';

export const BuilderCanvas: React.FC = () => {
  const { state, dispatch } = useBuilderContext();
  const activePage = selectActivePage(state);
  const sections = selectActivePageSections(state);
  const isPreview = selectIsPreviewMode(state);
  const previewViewport = selectPreviewViewport(state);
  const weddingData = state.weddingData ?? createEmptyWeddingData();
  const themeTokens = state.project?.themeTokens;

  useEffect(() => {
    if (themeTokens) {
      injectThemeStyle(themeTokens, THEME_STYLE_ID, CANVAS_SCOPE);
    } else {
      removeThemeStyle(THEME_STYLE_ID);
    }
    return () => removeThemeStyle(THEME_STYLE_ID);
  }, [themeTokens]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const [dragActiveId, setDragActiveId] = React.useState<string | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDragActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDragActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id || !activePage) return;

      const oldIndex = sections.findIndex(s => s.id === active.id);
      const newIndex = sections.findIndex(s => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(sections, oldIndex, newIndex);
      dispatch(builderActions.reorderSections(activePage.id, reordered.map(s => s.id)));
    },
    [sections, activePage, dispatch]
  );

  const renderSection = useCallback(
    (section: BuilderSectionInstance) => (
      <SectionRenderer
        section={section}
        weddingData={weddingData}
        isPreview={isPreview}
        globalAnimationPreset={state.project?.globalAnimationPreset}
      />
    ),
    [weddingData, isPreview, state.project?.globalAnimationPreset]
  );

  const dragActiveSection = dragActiveId ? sections.find(s => s.id === dragActiveId) : null;
  const emptyState = activePage ? getBuilderCanvasEmptyState(activePage.title, isPreview) : null;
  const pageEditingSummary = activePage
    ? getBuilderPageEditingSummary(activePage.title, sections)
    : null;
  const publishIssue = state.project
    ? getPublishIssue(state.project, state.weddingData, { isDirty: state.isDirty })
    : null;
  const previewBlockerUi = getPublishBlockerUiState({
    publishValidationError: publishIssue?.message ?? null,
    publishIssueKind: publishIssue?.kind ?? null,
  });
  const previewReview = activePage
    ? getBuilderPreviewReviewSummary({
        activePageTitle: activePage.title,
        sectionCount: sections.length,
        previewViewport,
        hasHardPublishBlocker: previewBlockerUi.hasHardPublishBlocker,
        canAutoSaveBeforePublish: previewBlockerUi.canAutoSaveBeforePublish,
        isDirty: state.isDirty,
        isPublished: state.project?.publishStatus === 'published' || typeof state.project?.publishedVersion === 'number',
      })
    : null;
  const handlePageEditingAction = useCallback((action: NonNullable<typeof pageEditingSummary>['primaryAction']) => {
    if (!activePage) return;

    switch (action.kind) {
      case 'add-section':
        dispatch(builderActions.addSectionByType(activePage.id, action.sectionType));
        return;
      case 'add-essential-kit':
        action.sectionTypes.forEach((sectionType) => {
          dispatch(builderActions.addSectionByType(activePage.id, sectionType));
        });
        return;
      case 'select-section':
        dispatch(builderActions.selectSection(action.sectionId));
        requestAnimationFrame(() => {
          const el = document.querySelector(`[data-section-id="${action.sectionId}"]`);
          if (el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        return;
      case 'open-template-gallery':
        dispatch(builderActions.openTemplateGallery());
        return;
      default:
        return;
    }
  }, [activePage, dispatch]);

  if (!activePage) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-10 text-center">
        <div className="max-w-md rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-6 py-8">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">Choose a page to keep editing</p>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Pick a page from the top bar first. Once a page is active, the canvas and inspector will stay in sync while you shape it.
          </p>
        </div>
      </div>
    );
  }

  const canvasEmptyState = emptyState ?? getBuilderCanvasEmptyState(activePage.title, isPreview);
  const canvasPageEditingSummary = pageEditingSummary
    ?? getBuilderPageEditingSummary(activePage.title, sections);
  const canvasPreviewReview = previewReview ?? getBuilderPreviewReviewSummary({
    activePageTitle: activePage.title,
    sectionCount: sections.length,
    previewViewport,
    hasHardPublishBlocker: previewBlockerUi.hasHardPublishBlocker,
    canAutoSaveBeforePublish: previewBlockerUi.canAutoSaveBeforePublish,
    isDirty: state.isDirty,
    isPublished: state.project?.publishStatus === 'published' || typeof state.project?.publishedVersion === 'number',
  });

  return (
    <div
      className={`flex-1 min-h-0 overflow-y-auto overscroll-contain ${isPreview ? 'bg-white' : 'bg-transparent px-1 pt-0 pb-0'} ${isPreview && previewViewport === 'mobile' ? 'px-2 py-2 md:px-3 md:py-4' : ''}`}
      onClick={() => dispatch(builderActions.selectSection(null))}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className={`builder-themed-canvas ${isPreview ? '' : 'max-w-[1320px] mx-auto shadow-sm rounded-lg overflow-hidden border border-[var(--color-border-subtle)]'} bg-[var(--color-surface)] min-h-full`}
          style={isPreview
            ? previewViewport === 'mobile'
              ? { maxWidth: 390, margin: '0 auto', boxShadow: '0 8px 28px rgba(15,23,42,0.14)', borderRadius: 18, overflow: 'hidden' }
              : previewViewport === 'tablet'
                ? { maxWidth: 820, margin: '0 auto', boxShadow: '0 8px 28px rgba(15,23,42,0.14)', borderRadius: 18, overflow: 'hidden' }
                : undefined
            : undefined}
        >
          {!isPreview && sections.length > 0 && !state.selectedSectionId && (
            <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-4 py-4 md:px-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">Page recovery</p>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-800">
                  {canvasPageEditingSummary.hiddenCount > 0
                    ? `${canvasPageEditingSummary.hiddenCount} hidden`
                    : canvasPageEditingSummary.missingEssentialLabels.length > 0
                      ? `${canvasPageEditingSummary.missingEssentialLabels.length} essentials missing`
                      : `${canvasPageEditingSummary.visibleCount} visible section${canvasPageEditingSummary.visibleCount === 1 ? '' : 's'}`}
                </span>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-900">Main focus</p>
                  <p className="mt-1 text-sm font-medium text-sky-950">{canvasPageEditingSummary.focusTitle}</p>
                  <p className="mt-2 text-xs leading-5 text-sky-800">{canvasPageEditingSummary.focusDetail}</p>
                </div>
                <div className="rounded-xl border border-[var(--color-border-subtle)] bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">Best next move</p>
                  <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">{canvasPageEditingSummary.bestNextMove}</p>
                  <p className="mt-3 text-xs leading-5 text-[var(--color-text-secondary)]">
                    <span className="font-semibold text-[var(--color-text-primary)]">Decision rule:</span> {canvasPageEditingSummary.decisionRule}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]">
                    <span className="font-semibold text-[var(--color-text-primary)]">Watchout:</span> {canvasPageEditingSummary.watchout}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-3">
                {[
                  { label: 'Current', detail: canvasPageEditingSummary.currentStep, status: 'current' as const },
                  { label: 'Next', detail: canvasPageEditingSummary.nextStep, status: 'next' as const },
                  { label: 'Then', detail: canvasPageEditingSummary.thenStep, status: 'then' as const },
                ].map((step) => (
                  <div key={step.label} className="rounded-xl border border-[var(--color-border-subtle)] bg-white px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-[var(--color-text-primary)]">{step.label}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        step.status === 'current'
                          ? 'border border-primary/20 bg-primary-light text-primary'
                          : step.status === 'next'
                            ? 'border border-warning/20 bg-warning-light text-warning'
                            : 'border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]'
                      }`}>
                        {getFlowStatusLabel(step.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]">{step.detail}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handlePageEditingAction(canvasPageEditingSummary.primaryAction)}
                  className="rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-[var(--color-text-inverse)] hover:bg-[var(--color-accent-hover)]"
                >
                  {canvasPageEditingSummary.primaryAction.label}
                </button>
                <button
                  type="button"
                  onClick={() => handlePageEditingAction(canvasPageEditingSummary.secondaryAction)}
                  className="rounded-lg border border-[var(--color-border-subtle)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]"
                >
                  {canvasPageEditingSummary.secondaryAction.label}
                </button>
              </div>
            </div>
          )}
          {isPreview && sections.length > 0 && (
            <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-4 py-4 md:px-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">Guest rehearsal</p>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-800">
                  {canvasPreviewReview.badge}
                </span>
                <span className="rounded-full border border-[var(--color-border-subtle)] bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                  {previewViewport === 'desktop' ? 'Desktop' : previewViewport === 'tablet' ? 'Tablet' : 'Mobile'}
                </span>
              </div>
              <p className="mt-3 text-sm font-medium text-[var(--color-text-primary)]">{canvasPreviewReview.heading}</p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{canvasPreviewReview.summary}</p>
              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-900">Main focus</p>
                  <p className="mt-1 text-sm font-medium text-sky-950">{canvasPreviewReview.focusTitle}</p>
                  <p className="mt-2 text-xs leading-5 text-sky-800">{canvasPreviewReview.focusDetail}</p>
                </div>
                <div className="rounded-xl border border-[var(--color-border-subtle)] bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">Best next move</p>
                  <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">{canvasPreviewReview.bestNextMove}</p>
                  <p className="mt-3 text-xs leading-5 text-[var(--color-text-secondary)]">
                    <span className="font-semibold text-[var(--color-text-primary)]">Decision rule:</span> {canvasPreviewReview.decisionRule}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]">
                    <span className="font-semibold text-[var(--color-text-primary)]">Watchout:</span> {canvasPreviewReview.watchout}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-3">
                {canvasPreviewReview.sequence.map((step) => (
                  <div key={`${step.status}-${step.label}`} className="rounded-xl border border-[var(--color-border-subtle)] bg-white px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-[var(--color-text-primary)]">{step.label}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        step.status === 'current'
                          ? 'border border-primary/20 bg-primary-light text-primary'
                          : step.status === 'next'
                            ? 'border border-warning/20 bg-warning-light text-warning'
                            : 'border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]'
                      }`}>
                        {getFlowStatusLabel(step.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]">{step.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {sections.length === 0 ? (
            <div className="flex min-h-[420px] items-center justify-center px-6 py-10">
              <div className="w-full max-w-xl rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-6 py-8 text-center">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{canvasEmptyState.title}</p>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{canvasEmptyState.detail}</p>
                {!isPreview && (
                  <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-left">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-900">Main focus</p>
                    <p className="mt-1 text-sm font-medium text-sky-950">{canvasPageEditingSummary.focusTitle}</p>
                    <p className="mt-1 text-xs text-sky-800">{canvasPageEditingSummary.focusDetail}</p>
                  </div>
                )}
                {!isPreview && (
                  <div className="mt-5 grid gap-3 text-left sm:grid-cols-3">
                    <div className="rounded-xl border border-[var(--color-border-subtle)] bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">Current</p>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{canvasPageEditingSummary.currentStep}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--color-border-subtle)] bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">Next</p>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{canvasPageEditingSummary.nextStep}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--color-border-subtle)] bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">Then</p>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{canvasPageEditingSummary.thenStep}</p>
                    </div>
                  </div>
                )}
                {!isPreview && (
                  <div className="mt-5 rounded-xl border border-[var(--color-border-subtle)] bg-white px-4 py-3 text-left">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">Best next move</p>
                    <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">{canvasPageEditingSummary.bestNextMove}</p>
                    <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                      <span className="font-semibold text-[var(--color-text-primary)]">Decision rule:</span> {canvasPageEditingSummary.decisionRule}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      <span className="font-semibold text-[var(--color-text-primary)]">Watchout:</span> {canvasPageEditingSummary.watchout}
                    </p>
                  </div>
                )}
                {!isPreview && (
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePageEditingAction(canvasPageEditingSummary.primaryAction)}
                      className="rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-[var(--color-text-inverse)] hover:bg-[var(--color-accent-hover)]"
                    >
                      {canvasPageEditingSummary.primaryAction.label}
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePageEditingAction(canvasPageEditingSummary.secondaryAction)}
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]"
                    >
                      {canvasPageEditingSummary.secondaryAction.label}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <BuilderDropZone
              pageId={activePage.id}
              sections={sections}
              selectedSectionId={state.selectedSectionId}
              hoveredSectionId={state.hoveredSectionId}
              onSelectSection={(sectionId) => dispatch(builderActions.selectSection(sectionId))}
              renderSection={renderSection}
              isPreview={isPreview}
            />
          )}
        </div>

        <DragOverlay>
          {dragActiveSection && (
            <div className="bg-white shadow-2xl rounded-lg opacity-90 p-4 text-sm font-medium text-gray-700">
              Moving: {getSectionManifest(dragActiveSection.type).label}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
