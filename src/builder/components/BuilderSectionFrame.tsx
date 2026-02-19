import React, { useState } from 'react';
import { GripVertical, Eye, EyeOff, Settings2, Trash2, Copy, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { DeleteSectionModal } from './DeleteSectionModal';
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
  const [inlineEditOpen, setInlineEditOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    dispatch(builderActions.removeSection(pageId, section.id));
    dispatch(builderActions.selectSection(null));
    setShowDeleteModal(false);
  };

  const isHighlighted = !isPreview && (isSelected || isHovered);

  const textFields = manifest.settingsSchema.fields.filter(
    f => f.type === 'text' || f.type === 'textarea'
  );
  const hasInlineFields = textFields.length > 0;

  if (isPreview) {
    return (
      <div style={style} data-section-id={section.id} className={!section.enabled ? 'hidden' : ''}>
        {children}
      </div>
    );
  }

  const deleteModal = showDeleteModal ? (
    <DeleteSectionModal
      sectionLabel={manifest.label}
      onConfirm={confirmDelete}
      onCancel={() => setShowDeleteModal(false)}
    />
  ) : null;

  if (!section.enabled) {
    return (
      <>
      <div
        ref={setNodeRef}
        style={style}
        data-section-id={section.id}
        className="relative group"
        onClick={handleSelect}
        onMouseEnter={() => dispatch(builderActions.hoverSection(section.id))}
        onMouseLeave={() => dispatch(builderActions.hoverSection(null))}
      >
        <div className={`flex items-center justify-between px-3 py-2 border border-dashed transition-colors ${
          isHighlighted ? 'border-rose-300 bg-rose-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
        }`}>
          <div className="flex items-center gap-2">
            {manifest.capabilities.draggable && !section.locked && (
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-0.5 rounded text-gray-400 hover:text-gray-600"
                onClick={e => e.stopPropagation()}
                aria-label="Drag to reorder"
              >
                <GripVertical size={12} />
              </button>
            )}
            <EyeOff size={12} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-400">{manifest.label}</span>
            {section.variant !== 'default' && (
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded">{section.variant}</span>
            )}
            <span className="text-[10px] text-gray-400">Hidden</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleVisibility}
              title="Show section"
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
            >
              <Eye size={11} />
              Show
            </button>
            {manifest.capabilities.deletable && !section.locked && (
              <button
                onClick={handleDelete}
                title="Delete section"
                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        </div>
      </div>
      {deleteModal}
      </>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-section-id={section.id}
      className={`relative group transition-all duration-150 ${
        isHighlighted ? 'ring-2 ring-rose-400 ring-inset' : ''
      }`}
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
              <span className="bg-rose-600 px-1.5 py-0.5 rounded text-[10px]">{section.variant}</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {hasInlineFields && (
              <button
                onClick={e => { e.stopPropagation(); setInlineEditOpen(v => !v); }}
                title="Quick edit text"
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  inlineEditOpen ? 'bg-white text-rose-600' : 'hover:bg-rose-600'
                }`}
              >
                <Pencil size={11} />
                Edit Text
                {inlineEditOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
            )}
            <button
              onClick={handleToggleVisibility}
              title="Hide section"
              className="p-1 hover:bg-rose-600 rounded transition-colors"
            >
              <Eye size={12} />
            </button>
            {manifest.capabilities.duplicable && (
              <button
                onClick={handleDuplicate}
                title="Duplicate section"
                className="p-1 hover:bg-rose-600 rounded transition-colors"
              >
                <Copy size={12} />
              </button>
            )}
            <button
              onClick={handleSelect}
              title="Section settings"
              className="p-1 hover:bg-rose-600 rounded transition-colors"
            >
              <Settings2 size={12} />
            </button>
            {manifest.capabilities.deletable && !section.locked && (
              <button
                onClick={handleDelete}
                title="Delete section"
                className="p-1 hover:bg-red-700 rounded transition-colors"
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

      {isSelected && inlineEditOpen && hasInlineFields && (
        <InlineEditPanel
          section={section}
          pageId={pageId}
          fields={textFields}
          onClose={() => setInlineEditOpen(false)}
        />
      )}
      {deleteModal}
    </div>
  );
};

const InlineEditPanel: React.FC<{
  section: BuilderSectionInstance;
  pageId: string;
  fields: Array<{ key: string; label: string; type: string; placeholder?: string; defaultValue?: string | boolean | number }>;
  onClose: () => void;
}> = ({ section, pageId, fields, onClose }) => {
  const { dispatch } = useBuilderContext();

  const handleChange = (key: string, value: string) => {
    dispatch(
      builderActions.updateSection(pageId, section.id, {
        settings: { ...section.settings, [key]: value },
      })
    );
  };

  return (
    <div
      className="border-t-2 border-rose-400 bg-white shadow-xl z-10 relative"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-4 py-2.5 bg-rose-50 border-b border-rose-100">
        <div className="flex items-center gap-2">
          <Pencil size={12} className="text-rose-500" />
          <span className="text-xs font-semibold text-rose-700">Quick Edit</span>
          <span className="text-[10px] text-rose-400">— changes apply live</span>
        </div>
        <button
          onClick={onClose}
          className="text-rose-400 hover:text-rose-600 transition-colors p-1 rounded hover:bg-rose-100"
        >
          <ChevronUp size={14} />
        </button>
      </div>
      <div className="p-4 grid gap-3">
        {fields.map(field => (
          <div key={field.key}>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              {field.label}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                value={(section.settings[field.key] as string) ?? (field.defaultValue as string) ?? ''}
                onChange={e => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}...`}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none bg-gray-50 focus:bg-white transition-colors"
                autoFocus={fields[0].key === field.key}
              />
            ) : (
              <input
                type="text"
                value={(section.settings[field.key] as string) ?? (field.defaultValue as string) ?? ''}
                onChange={e => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}...`}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 focus:bg-white transition-colors"
                autoFocus={fields[0].key === field.key}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
