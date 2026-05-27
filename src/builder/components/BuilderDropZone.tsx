import React from 'react';
import { Plus } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { BuilderSectionInstance } from '../../types/builder/section';
import { BuilderSectionFrame } from './BuilderSectionFrame';
import { getBuilderSectionRecoverySummary } from './builderSectionRecoverySummary';

interface BuilderDropZoneProps {
  pageId: string;
  sections: BuilderSectionInstance[];
  selectedSectionId: string | null;
  hoveredSectionId: string | null;
  onSelectSection: (sectionId: string) => void;
  renderSection?: (section: BuilderSectionInstance) => React.ReactNode;
  isPreview?: boolean;
}

export const BuilderDropZone: React.FC<BuilderDropZoneProps> = ({
  pageId,
  sections,
  selectedSectionId,
  hoveredSectionId,
  onSelectSection,
  renderSection,
  isPreview,
}) => {
  const { isOver, setNodeRef } = useDroppable({ id: `dropzone-${pageId}` });
  const recoverySummary = getBuilderSectionRecoverySummary(sections);
  const hiddenOnly = recoverySummary.total > 0 && recoverySummary.visible === 0;

  return (
    <div
      ref={setNodeRef}
      className={`min-h-full transition-colors ${isOver ? 'bg-rose-50/30' : ''}`}
    >
      {hiddenOnly && (
        <div className="mx-4 mt-4 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-900">Page recovery</p>
          <p className="mt-1 text-sm font-semibold text-sky-950">{recoverySummary.focusTitle}</p>
          <p className="mt-1 text-xs leading-relaxed text-sky-900">{recoverySummary.bestNextMove}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (recoverySummary.primaryAction.sectionId) {
                  onSelectSection(recoverySummary.primaryAction.sectionId);
                }
              }}
              className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-sky-800 hover:bg-sky-100"
            >
              {recoverySummary.primaryAction.label}
            </button>
            {recoverySummary.secondaryAction.sectionId && (
              <button
                type="button"
                onClick={() => onSelectSection(recoverySummary.secondaryAction.sectionId!)}
                className="rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-[11px] font-medium text-sky-800 hover:bg-sky-100"
              >
                {recoverySummary.secondaryAction.label}
              </button>
            )}
          </div>
        </div>
      )}
      <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
        {sections.map(section => (
          <BuilderSectionFrame
            key={section.id}
            section={section}
            pageId={pageId}
            isSelected={selectedSectionId === section.id}
            isHovered={hoveredSectionId === section.id}
            isPreview={isPreview}
          >
            {renderSection?.(section)}
          </BuilderSectionFrame>
        ))}
      </SortableContext>

      {sections.length === 0 && !isPreview && <BuilderEmptyDropState />}

      {isOver && (
        <div className="h-0.5 bg-rose-400 rounded-full mx-4 my-1 transition-all" />
      )}
    </div>
  );
};

const BuilderEmptyDropState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <Plus size={28} className="text-gray-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-700 mb-1">Start building your site</h3>
      <p className="text-sm text-gray-400 max-w-xs">
        Add sections from the left panel, or apply a template to get started instantly.
      </p>
    </div>
  );
};
