import React from 'react';
import { GripVertical, Eye, EyeOff, Settings, Trash2, Copy } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BuilderSectionInstance } from '../../types/builder/section';
import { useBuilderContext } from '../state/builderStore';
import { builderActions } from '../state/builderActions';
import { getSectionManifest } from '../registry/sectionManifests';

interface BuilderSectionFrameProps {
  section: BuilderSectionInstance;
  pageId: string;
  children?: React.ReactNode;
  isSelected: boolean;
  isHovered: boolean;
  isPreview?: boolean;
}

export const BuilderSectionFrame: React.FC<BuilderSectionFrameProps> = ({
  section,
  pageId,
  children,
  isSelected,
  isHovered,
  isPreview,
}) => {
  const { dispatch } = useBuilderContext();
  const manifest = getSectionManifest(section.type);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
    disabled: section.locked || isPreview,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleSelect = (e: React.MouseEvent) => {
    if (isPreview) return;
    e.stopPropagation();
    dispatch(builderActions.selectSection(section.id));
  };

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(builderActions.toggleSectionVisibility(pageId, section.id));
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(builderActions.duplicateSection(pageId, section.id));
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (section.locked || !manifest.capabilities.deletable) return;
    dispatch(builderActions.removeSection(pageId, section.id));
    dispatch(builderActions.selectSection(null));
  };

  const isHighlighted = !isPreview && (isSelected || isHovered);

  if (isPreview) {
    return (
      <div style={style} className={!section.enabled ? 'hidden' : ''}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group transition-all duration-150 ${
        !section.enabled ? 'opacity-40' : ''
      } ${isHighlighted ? 'ring-2 ring-rose-400 ring-inset' : ''}`}
      onClick={handleSelect}
      onMouseEnter={() => dispatch(builderActions.hoverSection(section.id))}
      onMouseLeave={() => dispatch(builderActions.hoverSection(null))}
    >
      {isHighlighted && (
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-1.5 bg-rose-500 text-white text-xs font-medium">
          <div className="flex items-center gap-2">
            {manifest.capabilities.draggable && !section.locked && (
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-rose-600 rounded"
                onClick={e => e.stopPropagation()}
                aria-label="Drag to reorder"
              >
                <GripVertical size={12} />
              </button>
            )}
            <span>{manifest.label}</span>
            {section.variant !== 'default' && (
              <span className="bg-rose-600 px-1.5 py-0.5 rounded text-xs">{section.variant}</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleVisibility}
              title={section.enabled ? 'Hide section' : 'Show section'}
              className="p-1 hover:bg-rose-600 rounded transition-colors"
              aria-label={section.enabled ? 'Hide section' : 'Show section'}
            >
              {section.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>
            {manifest.capabilities.duplicable && (
              <button
                onClick={handleDuplicate}
                title="Duplicate section"
                className="p-1 hover:bg-rose-600 rounded transition-colors"
                aria-label="Duplicate section"
              >
                <Copy size={12} />
              </button>
            )}
            <button
              onClick={handleSelect}
              title="Section settings"
              className="p-1 hover:bg-rose-600 rounded transition-colors"
              aria-label="Open section settings"
            >
              <Settings size={12} />
            </button>
            {manifest.capabilities.deletable && !section.locked && (
              <button
                onClick={handleDelete}
                title="Delete section"
                className="p-1 hover:bg-red-700 rounded transition-colors"
                aria-label="Delete section"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className={isHighlighted ? 'pt-7' : ''}>
        {children ?? (
          <div className="h-20 bg-gray-50 flex items-center justify-center border-2 border-dashed border-gray-200">
            <span className="text-sm text-gray-400">{manifest.label}</span>
          </div>
        )}
      </div>
    </div>
  );
};
