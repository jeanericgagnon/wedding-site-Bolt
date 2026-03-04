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
    [weddingData, isPreview]
  );

  const dragActiveSection = dragActiveId ? sections.find(s => s.id === dragActiveId) : null;

  if (!activePage) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        No page selected
      </div>
    );
  }

  return (
    <div
      className={`flex-1 min-h-0 overflow-y-auto overscroll-contain ${isPreview ? 'bg-white' : 'bg-transparent'} ${isPreview && previewViewport === 'mobile' ? 'px-3 py-4' : ''}`}
      onClick={() => dispatch(builderActions.selectSection(null))}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className={`builder-themed-canvas ${isPreview ? '' : 'max-w-[1160px] mx-auto shadow-sm rounded-2xl overflow-hidden border border-neutral-200'} bg-white min-h-full`}
          style={isPreview
            ? previewViewport === 'mobile'
              ? { maxWidth: 390, margin: '0 auto', boxShadow: '0 8px 28px rgba(15,23,42,0.14)' }
              : previewViewport === 'tablet'
                ? { maxWidth: 820, margin: '0 auto', boxShadow: '0 8px 28px rgba(15,23,42,0.14)' }
                : undefined
            : undefined}
        >

          <BuilderDropZone
            pageId={activePage.id}
            sections={sections}
            selectedSectionId={state.selectedSectionId}
            hoveredSectionId={state.hoveredSectionId}
            renderSection={renderSection}
            isPreview={isPreview}
          />
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
