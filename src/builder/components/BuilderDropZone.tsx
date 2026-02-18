import React from 'react';
import { Plus } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { BuilderSectionInstance } from '../../types/builder/section';
import { BuilderSectionFrame } from './BuilderSectionFrame';

interface BuilderDropZoneProps {
  pageId: string;
  sections: BuilderSectionInstance[];
  selectedSectionId: string | null;
  hoveredSectionId: string | null;
  renderSection?: (section: BuilderSectionInstance) => React.ReactNode;
  isPreview?: boolean;
}

export const BuilderDropZone: React.FC<BuilderDropZoneProps> = ({
  pageId,
  sections,
  selectedSectionId,
  hoveredSectionId,
  renderSection,
  isPreview,
}) => {
  const { isOver, setNodeRef } = useDroppable({ id: `dropzone-${pageId}` });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-full transition-colors ${isOver ? 'bg-rose-50/30' : ''}`}
    >
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
