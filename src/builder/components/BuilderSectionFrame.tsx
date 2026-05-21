import React, { useState } from 'react';
import { GripVertical, Eye, EyeOff, Settings2, Trash2, Copy, ChevronDown, ChevronUp, Pencil, FilePlus2 } from 'lucide-react';
import { DeleteSectionModal } from './DeleteSectionModal';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BuilderSectionInstance, BuilderSettingsField } from '../../types/builder/section';
import { useBuilderContext } from '../state/builderStore';
import { builderActions } from '../state/builderActions';
import { markFieldAsUserEdited, readBuilderValue } from '../../lib/weddingProfile';
import { getSectionManifest } from '../registry/sectionManifests';
import { normalizePageAnchorSlug } from '../utils/sectionAnchors';

interface BuilderSectionFrameProps {
  section: BuilderSectionInstance;
  pageId: string;
  children?: React.ReactNode;
  isSelected: boolean;
  isHovered: boolean;
  isPreview?: boolean;
}

const INLINE_FIELD_KEYS_BY_SECTION: Partial<Record<BuilderSectionInstance['type'], string[]>> = {
  hero: ['headline', 'subtitle'],
  story: ['title', 'storyText'],
};

const INLINE_CTA_FIELD_PATTERN = /(?:^|_)(buttonLabel|ctaLabel|ctaText|label)$/i;

const DEDICATED_PAGE_TITLE_BY_SECTION: Partial<Record<BuilderSectionInstance['type'], string>> = {
  accommodations: 'Accommodations',
  contact: 'Contact',
  directions: 'Directions',
  faq: 'FAQ',
  menu: 'Menu',
  music: 'Music',
  registry: 'Registry',
  rsvp: 'RSVP',
  schedule: 'Schedule',
  travel: 'Travel',
  venue: 'Venue',
};

function getDedicatedPageTitle(section: BuilderSectionInstance, fallbackLabel: string): string {
  const customTitle = readBuilderValue(
    section.settings?.title as string | { value: string } | undefined,
    '',
  ).trim();
  return customTitle || DEDICATED_PAGE_TITLE_BY_SECTION[section.type] || fallbackLabel;
}

function makeDedicatedPageSlugPreview(
  title: string,
  pages: Array<{ id?: string; slug?: unknown }> = [],
): string {
  const baseSlug = normalizePageAnchorSlug(title) || 'page';
  const usedSlugs = new Set(
    pages
      .flatMap((page) => [normalizePageAnchorSlug(page.slug), normalizePageAnchorSlug(page.id)])
      .filter(Boolean)
  );
  if (!usedSlugs.has(baseSlug)) return baseSlug;

  let suffix = 2;
  while (usedSlugs.has(`${baseSlug}-${suffix}`)) suffix += 1;
  return `${baseSlug}-${suffix}`;
}

function getInlineCanvasFields(sectionType: BuilderSectionInstance['type'], fields: BuilderSettingsField[]): BuilderSettingsField[] {
  const keyPriority = INLINE_FIELD_KEYS_BY_SECTION[sectionType] ?? [];
  const fieldMap = new Map(fields.map(field => [field.key, field]));

  const prioritized = keyPriority
    .map(key => fieldMap.get(key))
    .filter((field): field is BuilderSettingsField => !!field && (field.type === 'text' || field.type === 'textarea'));

  const ctaFields = fields.filter((field) => {
    if (prioritized.some((picked) => picked.key === field.key)) return false;
    if (field.type !== 'text') return false;
    return INLINE_CTA_FIELD_PATTERN.test(field.key);
  });

  return [...prioritized, ...ctaFields];
}

export const BuilderSectionFrame: React.FC<BuilderSectionFrameProps> = ({
  section,
  pageId,
  children,
  isSelected,
  isHovered,
  isPreview,
}) => {
  const { state, dispatch } = useBuilderContext();
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

  const handleMakeDedicatedPage = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(builderActions.createPageFromSection(pageId, section.id, getDedicatedPageTitle(section, manifest.label)));
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

  const inlineCanvasFields = getInlineCanvasFields(section.type, manifest.settingsSchema.fields);
  const hasInlineFields = inlineCanvasFields.length > 0;
  const projectPages = state.project?.pages ?? [];
  const sourcePageSectionCount = projectPages.find((page) => page.id === pageId)?.sections.length ?? 0;
  const canMakeDedicatedPage = !section.locked && sourcePageSectionCount > 1;
  const dedicatedPageTitle = getDedicatedPageTitle(section, manifest.label);
  const dedicatedPageRoute = `/${makeDedicatedPageSlugPreview(dedicatedPageTitle, projectPages)}`;

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
          isHighlighted ? 'border-[#cdbfae] bg-[#fbf7f1]' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
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
              <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-500">Alt style</span>
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
                className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700"
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
      className={`relative group scroll-mt-24 transition-all duration-150 cursor-pointer ${
        isHighlighted ? 'ring-2 ring-[#8b7a67] ring-inset' : ''
      }`}
      onClick={handleSelect}
      onMouseEnter={() => dispatch(builderActions.hoverSection(section.id))}
      onMouseLeave={() => dispatch(builderActions.hoverSection(null))}
    >

      {isHighlighted && (
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-1.5 bg-[#2f261d] text-white text-xs font-medium shadow-none">
          <div className="flex items-center gap-2">
            {manifest.capabilities.draggable && !section.locked && (
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-white/10 rounded"
                onClick={e => e.stopPropagation()}
                aria-label="Drag to reorder"
              >
                <GripVertical size={12} />
              </button>
            )}
            <span>{manifest.label}</span>
            {section.variant !== 'default' && (
              <span className="rounded bg-white/12 px-1.5 py-0.5 text-[10px] text-white/80">Alt style</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {hasInlineFields && (
              <button
                onClick={e => { e.stopPropagation(); setInlineEditOpen(v => !v); }}
                title="Quick edit text"
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  inlineEditOpen ? 'bg-white text-[#2f261d]' : 'hover:bg-white/10'
                }`}
              >
                <Pencil size={11} />
                Edit text
                {inlineEditOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
            )}
            <button
              onClick={handleToggleVisibility}
              title="Hide section"
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <Eye size={12} />
            </button>
            {manifest.capabilities.duplicable && (
              <button
                onClick={handleDuplicate}
                title="Duplicate section"
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <Copy size={12} />
              </button>
            )}
            {canMakeDedicatedPage && (
              <button
                onClick={handleMakeDedicatedPage}
                title={`Move ${manifest.label} to a dedicated ${dedicatedPageRoute} page`}
                aria-label={`Move ${manifest.label} to a dedicated page`}
                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors hover:bg-white/10"
              >
                <FilePlus2 size={11} />
                {dedicatedPageRoute}
              </button>
            )}
            <button
              onClick={handleSelect}
              title="Section settings"
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <Settings2 size={12} />
            </button>
            {manifest.capabilities.deletable && !section.locked && (
              <button
                onClick={handleDelete}
                title="Delete section"
                className="rounded p-1 transition-colors hover:bg-white/10"
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
          fields={inlineCanvasFields}
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
        settings: { ...section.settings, [key]: markFieldAsUserEdited(value) },
      })
    );
  };

  return (
    <div
      className="relative z-10 border-t border-border-subtle bg-white shadow-none"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-subtle/70 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Pencil size={12} className="text-primary" />
          <span className="text-xs font-semibold text-text-primary">Quick edit</span>
          <span className="text-[10px] text-text-tertiary">Changes apply in the preview</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-xl p-1 text-text-tertiary transition-colors hover:bg-white hover:text-text-primary"
        >
          <ChevronUp size={14} />
        </button>
      </div>
      <div className="p-4 grid gap-3">
        {fields.map(field => {
          const inputId = `inline-edit-${section.id}-${field.key}`;
          return (
            <div key={field.key}>
              <label htmlFor={inputId} className="text-[10px] font-semibold text-gray-500 block mb-1">
                {field.label}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  id={inputId}
                  value={readBuilderValue(section.settings[field.key] as string | { value: string } | undefined, (field.defaultValue as string) ?? '')}
                  onChange={e => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}...`}
                  rows={3}
                  className="w-full rounded-xl border border-border-subtle bg-surface-subtle px-3 py-2 text-sm text-text-primary transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/25 resize-none"
                  autoFocus={fields[0].key === field.key}
                />
              ) : (
                <input
                  id={inputId}
                  type="text"
                  value={readBuilderValue(section.settings[field.key] as string | { value: string } | undefined, (field.defaultValue as string) ?? '')}
                  onChange={e => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}...`}
                  className="w-full rounded-xl border border-border-subtle bg-surface-subtle px-3 py-2 text-sm text-text-primary transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/25"
                  autoFocus={fields[0].key === field.key}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
