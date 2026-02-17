import React, { useCallback } from 'react';
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
} from '../state/builderSelectors';
import { BuilderDropZone } from './BuilderDropZone';
import { BuilderSectionInstance } from '../../types/builder/section';
import { getSectionManifest } from '../registry/sectionManifests';

interface BuilderCanvasProps {
  renderSectionPreview?: (section: BuilderSectionInstance) => React.ReactNode;
}

export const BuilderCanvas: React.FC<BuilderCanvasProps> = ({ renderSectionPreview }) => {
  const { state, dispatch } = useBuilderContext();
  const activePage = selectActivePage(state);
  const sections = selectActivePageSections(state);
  const isPreview = selectIsPreviewMode(state);

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
      className={`flex-1 overflow-y-auto ${isPreview ? 'bg-white' : 'bg-gray-100'}`}
      onClick={() => dispatch(builderActions.selectSection(null))}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className={`${isPreview ? '' : 'max-w-4xl mx-auto my-6 shadow-xl rounded-lg overflow-hidden'} bg-white min-h-full`}>
          {!isPreview && (
            <div className="bg-gray-200 flex items-center gap-1.5 px-4 py-2.5">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <div className="flex-1 bg-white rounded h-5 mx-4 text-xs text-gray-400 flex items-center justify-center">
                yourwedding.com
              </div>
            </div>
          )}

          <BuilderDropZone
            pageId={activePage.id}
            sections={sections}
            selectedSectionId={state.selectedSectionId}
            hoveredSectionId={state.hoveredSectionId}
            renderSection={renderSectionPreview}
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
