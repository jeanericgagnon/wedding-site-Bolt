import React, { useState, useCallback, useMemo } from 'react';
import { DeleteSectionModal } from './DeleteSectionModal';
import { SkeletonPickerModal } from './SkeletonPickerModal';
import {
  Image, Heart, MapPin, Clock, Plane, Gift, HelpCircle, Mail, Images,
  Layout, Palette, FolderOpen, ChevronRight, ArrowLeft, Plus, LucideIcon,
  Layers, Eye, EyeOff, Trash2, GripVertical, Sparkles,
} from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBuilderContext } from '../state/builderStore';
import { builderActions } from '../state/builderActions';
import { getAllSectionManifests, BuilderSectionDefinitionWithMeta, VariantMeta, getSectionManifest } from '../registry/sectionManifests';
import { BuilderSectionType, BuilderSectionInstance, createDefaultSectionInstance } from '../../types/builder/section';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionRenderer } from './SectionRenderer';
import { SectionTypePreview } from './SectionTypePreview';
import { VariantPreviewSwatch } from './VariantPreviewSwatch';
import { selectActivePageSections } from '../state/builderSelectors';
import { CustomSectionSkeleton } from '../../sections/variants/custom/skeletons';
import {
  buildPreviewSettings,
  buildPreviewWeddingData,
  hasLivePreviewSupport,
  PREVIEW_PHOTO_SET_OPTIONS,
  type PreviewPhotoSet,
} from './builderSidebarPreviewData';
import {
  buildVariantPreviewWeddingData,
  getVariantArtDirection,
  getVariantTone,
  getVariantToneKey,
} from './builderVariantPreviewMetadata';


type SidebarTab = 'sections' | 'layers' | 'templates' | 'media';

const SECTION_ICONS: Record<string, LucideIcon> = {
  Image, Heart, MapPin, Clock, Plane, Gift, HelpCircle, Mail, Images,
};

const SECTION_PICKER_EDITORIAL_NOTES: Partial<Record<BuilderSectionType, string>> = {
  hero: 'Set the first impression and make the invitation feel clear.',
  story: 'Share your story in a way guests will actually read.',
  venue: 'Make location details easy to understand at a glance.',
  schedule: 'Organize the weekend into something guests can follow quickly.',
  travel: 'Help guests with logistics without cluttering the page.',
  registry: 'Present gifting options in a way that feels warm and complete.',
  faq: 'Answer the questions guests ask most before they have to text you.',
  rsvp: 'Make replying feel simple and obvious.',
  gallery: 'Show the feeling of the weekend through strong photos.',
  custom: 'Build something custom when the standard sections are not enough.',
};

const SECTION_PICKER_STORY_LABEL: Partial<Record<BuilderSectionType, string>> = {
  hero: 'Opening section',
  story: 'Story',
  venue: 'Venue',
  schedule: 'Schedule',
  travel: 'Travel guide',
  registry: 'Registry',
  faq: 'Questions',
  rsvp: 'RSVP',
  gallery: 'Gallery',
  custom: 'Custom layout',
};

const SECTION_PICKER_COMPOSITION_CUES: Partial<Record<BuilderSectionType, string>> = {
  hero: 'Start with the clearest, strongest invitation moment.',
  story: 'Open warm, add context, and finish before it feels long.',
  gallery: 'Lead with your strongest image, then support it with variety.',
  rsvp: 'Keep the call to reply obvious and easy to trust.',
  venue: 'Show where guests are going before layering in extra detail.',
  schedule: 'Put the main events first, then the supporting moments.',
  travel: 'Lead with what helps guests plan fastest.',
  registry: 'Keep the most relevant gifting options easy to scan.',
  contact: 'Offer help without making the page feel heavy.',
  'footer-cta': 'Close with a clear action and a warm reminder.',
};

interface BuilderSidebarLibraryProps {
  activePageId: string | null;
}

export const BuilderSidebarLibrary: React.FC<BuilderSidebarLibraryProps> = ({ activePageId }) => {
  const { state, dispatch } = useBuilderContext();
  const [activeTab, setActiveTab] = useState<SidebarTab>('layers');
  const [expandedType, setExpandedType] = useState<BuilderSectionType | null>(null);
  const [showSkeletonPicker, setShowSkeletonPicker] = useState(false);
  const [previewPhotoSet, setPreviewPhotoSet] = useState<PreviewPhotoSet>('romantic');
  const [quickPresetGroup, setQuickPresetGroup] = useState<'essentials' | 'extras'>('essentials');
  const previewWeddingData = useMemo(() => buildPreviewWeddingData(previewPhotoSet), [previewPhotoSet]);
  const manifests = getAllSectionManifests();

  const expandedManifest = expandedType
    ? manifests.find(m => m.type === expandedType) ?? null
    : null;

  function handleSectionClick(manifest: BuilderSectionDefinitionWithMeta) {
    if (manifest.type === 'custom') {
      setShowSkeletonPicker(true);
      return;
    }
    if (manifest.variantMeta.length > 1) {
      setExpandedType(manifest.type);
    } else {
      addSection(manifest.type, manifest.defaultVariant);
    }
  }

  function addSection(type: BuilderSectionType, variant: string) {
    if (!activePageId) return;
    dispatch(builderActions.addSectionByType(activePageId, type, undefined, variant));
    setExpandedType(null);
    setActiveTab('layers');
  }

  function addCustomSection(skeleton: CustomSectionSkeleton) {
    if (!activePageId) return;
    const instance = createDefaultSectionInstance('custom', 'default', 0);
    (instance as { settings: Record<string, unknown> }).settings = {
      skeletonId: skeleton.id,
      backgroundColor: skeleton.backgroundColor,
      paddingSize: skeleton.paddingSize,
      blocks: skeleton.blocks,
    };
    dispatch(builderActions.addSection(activePageId, instance));
    setShowSkeletonPicker(false);
    setActiveTab('layers');
    setTimeout(() => {
      const sectionEls = document.querySelectorAll('[data-section-id]');
      const last = sectionEls[sectionEls.length - 1];
      if (last) last.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  }

  const sections = selectActivePageSections(state);
  const [layerDragId, setLayerDragId] = useState<string | null>(null);

  const layerSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleLayerDragStart = useCallback((event: DragStartEvent) => {
    setLayerDragId(event.active.id as string);
  }, []);

  const handleLayerDragEnd = useCallback((event: DragEndEvent) => {
    setLayerDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id || !activePageId) return;
    const oldIndex = sections.findIndex(s => s.id === active.id);
    const newIndex = sections.findIndex(s => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(sections, oldIndex, newIndex);
    dispatch(builderActions.reorderSections(activePageId, reordered.map(s => s.id)));
  }, [sections, activePageId, dispatch]);

  const dragActiveSection = layerDragId ? sections.find(s => s.id === layerDragId) : null;

  const sidebarExpanded = activeTab === 'sections';

  return (
    <>
    <aside
      className={`flex-shrink-0 h-full min-h-0 bg-white border-b lg:border-b-0 lg:border-r border-[var(--color-border-subtle)] flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${sidebarExpanded ? 'w-full lg:w-96' : 'w-full lg:w-64'}`}
    >
      <div className="sticky top-0 z-20 flex border-b border-[var(--color-border-subtle)] bg-white">
        {([
          { id: 'layers', icon: Layers, label: 'Sections' },
          { id: 'sections', icon: Plus, label: 'Add' },
          { id: 'templates', icon: Palette, label: 'Templates' },
          { id: 'media', icon: FolderOpen, label: 'Media' },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'templates') dispatch(builderActions.openTemplateGallery());
              else if (tab.id === 'media') dispatch(builderActions.openMediaLibrary());
              else { setActiveTab(tab.id); setExpandedType(null); }
            }}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-[var(--color-text-primary)] border-b-2 border-[var(--color-accent)]'
                : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {activeTab === 'layers' && (
          <div className="p-3">
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-xs font-semibold text-gray-400">
                {sections.length} {sections.length === 1 ? 'Section' : 'Sections'}
              </p>
              <button
                onClick={() => { setActiveTab('sections'); setExpandedType(null); }}
                className="flex items-center gap-1 text-xs text-[var(--color-accent)] font-medium hover:text-[var(--color-accent-hover)] transition-colors"
              >
                <Plus size={12} />
                Add
              </button>
            </div>
            {sections.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Layers size={24} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs font-medium text-gray-500">No sections yet</p>
                <p className="text-xs mt-1 text-gray-300 mb-4">Start building your wedding site</p>
                <button
                  onClick={() => { setActiveTab('sections'); setExpandedType(null); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-accent)] text-white text-xs font-medium rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors"
                >
                  <Plus size={12} />
                  Add your first section
                </button>
              </div>
            ) : (
              <DndContext
                sensors={layerSensors}
                collisionDetection={closestCenter}
                onDragStart={handleLayerDragStart}
                onDragEnd={handleLayerDragEnd}
              >
                <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1">
                    {sections.map((section, index) => (
                      <SortableLayerItem
                        key={section.id}
                        section={section}
                        index={index}
                        pageId={activePageId}
                        isSelected={state.selectedSectionId === section.id}
                        isDragging={layerDragId === section.id}
                      />
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay>
                  {dragActiveSection && (
                    <LayerItemOverlay section={dragActiveSection} />
                  )}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        )}

        {activeTab === 'sections' && !expandedManifest && (
          <div className="p-3">
            <div className="mb-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]/70 p-2">
              <p className="px-1 text-[11px] font-semibold text-[var(--color-text-primary)] mb-2">Quick presets</p>
              <button
                onClick={() => {
                  const starter: BuilderSectionType[] = ['hero', 'story', 'schedule', 'travel', 'rsvp', 'gallery', 'faq'];
                  starter.forEach((type) => {
                    const manifest = getSectionManifest(type);
                    if (manifest) addSection(manifest.type, manifest.defaultVariant);
                  });
                }}
                className="mb-2 w-full rounded border border-[var(--color-border-subtle)] bg-white px-2 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)] transition-colors"
              >
                Add starter pack
              </button>

              <div className="mb-2 flex items-center gap-1 rounded-md border border-[var(--color-border-subtle)] bg-white p-1">
                <button
                  type="button"
                  onClick={() => setQuickPresetGroup('essentials')}
                  className={`flex-1 rounded px-2 py-1 text-[11px] font-medium ${quickPresetGroup === 'essentials' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]'}`}
                >
                  Essentials
                </button>
                <button
                  type="button"
                  onClick={() => setQuickPresetGroup('extras')}
                  className={`flex-1 rounded px-2 py-1 text-[11px] font-medium ${quickPresetGroup === 'extras' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]'}`}
                >
                  Extras
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {[
                  ...(quickPresetGroup === 'essentials'
                    ? [
                        { type: 'hero', label: 'Hero' },
                        { type: 'story', label: 'Story' },
                        { type: 'schedule', label: 'Itinerary' },
                        { type: 'travel', label: 'Travel' },
                        { type: 'faq', label: 'FAQ' },
                        { type: 'rsvp', label: 'RSVP' },
                      ]
                    : [
                        { type: 'registry', label: 'Registry' },
                        { type: 'gallery', label: 'Gallery' },
                        { type: 'contact', label: 'Interactive', variant: 'interactiveHub' },
                      ]),
                ].map((preset) => {
                  const manifest = getSectionManifest(preset.type as BuilderSectionType);
                  if (!manifest) return null;
                  return (
                    <button
                      key={`${preset.type}-${preset.variant ?? 'default'}`}
                      onClick={() => addSection(manifest.type, preset.variant ?? manifest.defaultVariant)}
                      className="rounded border border-[var(--color-border-subtle)] bg-white px-2 py-1.5 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)] transition-colors"
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {quickPresetGroup === 'extras' && (
                <button
                  onClick={() => {
                    const contactManifest = getSectionManifest('contact');
                    const faqManifest = getSectionManifest('faq');
                    if (contactManifest) addSection(contactManifest.type, 'interactiveHub');
                    if (faqManifest) addSection(faqManifest.type, faqManifest.defaultVariant);
                  }}
                  className="mt-2 w-full rounded border border-[var(--color-border-subtle)] bg-white px-2 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)] transition-colors"
                >
                  Add Interactive + FAQ
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 px-1 mb-3">
              <button
                onClick={() => setActiveTab('layers')}
                className="p-1 -ml-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Back to sections"
              >
                <ArrowLeft size={13} />
              </button>
              <p className="text-xs font-semibold text-gray-400">
                Add section
              </p>
              <span className="ml-auto text-[10px] text-gray-300">{manifests.length} types</span>
            </div>
            <div className="mb-2.5 flex items-center gap-1.5 px-1">
              <span className="text-[10px] font-semibold text-gray-400">Preview mood</span>
              <div className="ml-auto flex items-center gap-1">
                {PREVIEW_PHOTO_SET_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPreviewPhotoSet(opt.id)}
                    className={`rounded border px-1.5 py-0.5 text-[10px] font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 focus-visible:ring-offset-1 ${
                      previewPhotoSet === opt.id
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)] shadow-sm'
                        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {manifests.map(manifest => {
                const isCustom = manifest.type === 'custom';
                return (
                  <button
                    key={manifest.type}
                    onClick={() => handleSectionClick(manifest)}
                    className={`w-full text-left rounded-xl border transition-all duration-300 ease-out overflow-hidden group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/45 focus-visible:ring-offset-2 active:scale-[0.992] ${
                      isCustom
                        ? 'border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-accent-soft)] hover:shadow-sm'
                        : 'border-gray-200 bg-white hover:border-[var(--color-border-strong)] hover:shadow-sm'
                    }`}
                  >
                    <div className="pointer-events-none relative">
                      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-tr from-white/0 via-white/30 to-white/0" />
                      <BuilderVariantCardPreview
                        sectionType={manifest.type}
                        variantId={manifest.defaultVariant}
                        isHovered={false}
                        weddingData={buildPreviewWeddingData(previewPhotoSet, manifest.type)}
                      />
                      <div className="absolute top-1.5 right-1.5 rounded bg-black/45 px-1.5 py-0.5 text-[8px] font-semibold text-white/90">
                        {manifest.defaultVariant}
                      </div>
                      <div className="absolute top-1.5 left-1.5 rounded bg-white/85 px-1.5 py-0.5 text-[8px] font-semibold text-gray-600 shadow-sm">
                        {SECTION_PICKER_STORY_LABEL[manifest.type] ?? 'Section'}
                      </div>
                    </div>
                    <div className={`px-2.5 py-2 border-t ${isCustom ? 'border-[var(--color-border-subtle)]' : 'border-gray-100'}`}>
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="min-w-0">
                          <p className={`text-[11px] font-semibold truncate ${isCustom ? 'text-[var(--color-text-primary)]' : 'text-gray-700'}`}>{manifest.label}</p>
                          <p className="text-[9px] text-gray-400 truncate">
                            {isCustom ? '8 starter layouts' : `${manifest.variantMeta.length} ${manifest.variantMeta.length === 1 ? 'layout' : 'layouts'}`}
                          </p>
                        </div>
                        <ChevronRight size={12} className={`flex-shrink-0 transition-colors ${isCustom ? 'text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent)]' : 'text-gray-300 group-hover:text-[var(--color-accent)]'}`} />
                      </div>
                      <p className="mt-1 text-[9px] leading-relaxed text-gray-500 line-clamp-2">
                        {SECTION_PICKER_EDITORIAL_NOTES[manifest.type] ?? 'A strong starting section with clear structure and balanced spacing.'}
                      </p>
                      <p className="mt-1 text-[8px] leading-relaxed text-gray-400 line-clamp-2">
                        {SECTION_PICKER_COMPOSITION_CUES[manifest.type] ?? 'Start with what guests need first, then add the supporting details.'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'sections' && expandedManifest && (
          <VariantPicker
            manifest={expandedManifest}
            onBack={() => setExpandedType(null)}
            onSelect={(variant) => addSection(expandedManifest.type, variant)}
            previewPhotoSet={previewPhotoSet}
            onPreviewPhotoSetChange={setPreviewPhotoSet}
            previewWeddingData={previewWeddingData}
          />
        )}
      </div>
    </aside>

    {showSkeletonPicker && (
      <SkeletonPickerModal
        onSelect={addCustomSection}
        onClose={() => setShowSkeletonPicker(false)}
      />
    )}
  </>
  );
};

interface VariantPickerProps {
  manifest: BuilderSectionDefinitionWithMeta;
  onBack: () => void;
  onSelect: (variantId: string) => void;
  previewPhotoSet: PreviewPhotoSet;
  onPreviewPhotoSetChange: (photoSet: PreviewPhotoSet) => void;
  previewWeddingData: WeddingDataV1;
}

const VariantPicker: React.FC<VariantPickerProps> = ({
  manifest,
  onBack,
  onSelect,
  previewPhotoSet,
  onPreviewPhotoSetChange,
  previewWeddingData,
}) => {
  const [hoveredVariant, setHoveredVariant] = useState<string | null>(null);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const IconComp = SECTION_ICONS[manifest.icon] ?? Layout;

  React.useEffect(() => {
    setActiveVariantIndex(0);
  }, [manifest.type]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = !!target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      );
      if (isTyping) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveVariantIndex((idx) => Math.min(idx + 1, manifest.variantMeta.length - 1));
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveVariantIndex((idx) => Math.max(idx - 1, 0));
      }
      if (event.key === 'Enter') {
        const current = manifest.variantMeta[activeVariantIndex];
        if (current) {
          event.preventDefault();
          onSelect(current.id);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeVariantIndex, manifest.variantMeta, onSelect]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-3 border-b border-[var(--color-border-subtle)]">
        <button
          onClick={onBack}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
          aria-label="Back to sections"
        >
          <ArrowLeft size={14} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 bg-[var(--color-accent-soft)] rounded flex items-center justify-center flex-shrink-0">
            <IconComp size={13} className="text-[var(--color-accent)]" />
          </div>
          <p className="text-sm font-semibold text-gray-700 truncate">{manifest.label}</p>
        </div>
      </div>

      <div className="px-3.5 pt-3 pb-3 border-b border-neutral-200 bg-white">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] text-gray-400 font-semibold">Choose a layout</p>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-500">Each layout gives this section a different feel. Pick the one that fits best.</p>
          </div>
          <div className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-[10px] font-semibold text-neutral-700">
            {manifest.variantMeta.length} variants
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-gray-400">Preview mood</span>
          <div className="ml-auto flex items-center gap-1">
            {PREVIEW_PHOTO_SET_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onPreviewPhotoSetChange(opt.id)}
                className={`rounded border px-1.5 py-0.5 text-[10px] font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 focus-visible:ring-offset-1 ${
                  previewPhotoSet === opt.id
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)] shadow-sm'
                    : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 pb-3.5">
        <div className="mb-2 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-2.5 py-1.5">
          <span className="text-[10px] text-gray-500">Variant browser</span>
          <span className="text-[10px] font-medium text-gray-700">{activeVariantIndex + 1} / {manifest.variantMeta.length}</span>
        </div>
        <div className="mb-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[10px] text-gray-600">
          Use ↑ ↓ to move • Enter to add this section
        </div>
        <div className="grid grid-cols-1 gap-3">
          {manifest.variantMeta.map((variant: VariantMeta, idx) => (
            <VariantCard
              key={variant.id}
              variant={variant}
              sectionType={manifest.type}
              isDefault={variant.id === manifest.defaultVariant}
              isHovered={hoveredVariant === variant.id}
              isKeyboardActive={activeVariantIndex === idx}
              onHover={setHoveredVariant}
              onSelect={onSelect}
              onFocusIndex={() => setActiveVariantIndex(idx)}
              previewWeddingData={previewWeddingData}
              previewPhotoSet={previewPhotoSet}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface VariantCardProps {
  variant: VariantMeta;
  sectionType: string;
  isDefault: boolean;
  isHovered: boolean;
  isKeyboardActive: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onFocusIndex: () => void;
  previewWeddingData: WeddingDataV1;
  previewPhotoSet: PreviewPhotoSet;
}

function cueWithoutPrefix(cue?: string): string | null {
  if (!cue) return null;
  return cue.replace(/^sequence:\s*/i, '').trim();
}

function getVariantSequenceCue(sectionType: string, variantId: string): string | null {
  const fromArtDirection = cueWithoutPrefix(getVariantArtDirection(sectionType, variantId).sequenceCue);
  if (fromArtDirection) return fromArtDirection;
  const fromSection = cueWithoutPrefix(SECTION_PICKER_COMPOSITION_CUES[sectionType as BuilderSectionType]);
  return fromSection;
}

function getVariantCompositionCue(sectionType: string, variantId: string): string | null {
  const fromArtDirection = getVariantArtDirection(sectionType, variantId).compositionCue?.trim();
  if (fromArtDirection) return fromArtDirection;
  const fallbackByTone: Record<string, string> = {
    minimal: 'Maintain generous whitespace and keep one clear focal element.',
    formal: 'Favor symmetry, restrained contrast, and clean typographic hierarchy.',
    editorial: 'Balance one hero focal point with supporting detail frames.',
    cinematic: 'Use directional light and preserve depth between subject and background.',
    interactive: 'Keep controls unobstructed and visual weight centered near actions.',
    romantic: 'Use softer contrast and warm highlights for a cohesive romantic palette.',
    playful: 'Use expressive color accents while keeping primary copy highly legible.',
  };
  const toneKey = getVariantToneKey(variantId);
  return fallbackByTone[toneKey] ?? fallbackByTone.editorial;
}

const VariantCard: React.FC<VariantCardProps> = ({
  variant,
  sectionType,
  isDefault,
  isHovered,
  isKeyboardActive,
  onHover,
  onSelect,
  onFocusIndex,
  previewWeddingData,
  previewPhotoSet,
}) => {
  const tone = getVariantTone(variant.id);
  const artDirection = getVariantArtDirection(sectionType, variant.id);
  const curatedWeddingData = useMemo(() => (
    buildVariantPreviewWeddingData(sectionType, variant.id, previewPhotoSet)
  ), [sectionType, variant.id, previewPhotoSet, previewWeddingData]);
  const description = artDirection.description ?? variant.description;
  const sequenceCue = getVariantSequenceCue(sectionType, variant.id);
  const compositionCue = getVariantCompositionCue(sectionType, variant.id);

  return (
    <button
      onMouseEnter={() => onHover(variant.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={onFocusIndex}
      onClick={() => onSelect(variant.id)}
      className={`group relative w-full overflow-hidden rounded-xl border bg-white text-left will-change-transform transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/45 focus-visible:ring-offset-2 active:scale-[0.995] ${
        isHovered || isKeyboardActive
          ? 'border-[var(--color-accent)] shadow-sm -translate-y-[1px]'
          : 'border-neutral-200 hover:border-neutral-300 hover:shadow-sm'
      } ${isDefault ? 'ring-1 ring-[var(--color-accent)]/20' : ''}`}
      title={variant.description}
      aria-label={`Add ${variant.label} variant`}
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-br ${tone.accent} opacity-75`} />
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_80%_14%,rgba(255,255,255,0.7),transparent_38%)]" />
      <BuilderVariantCardPreview
        sectionType={sectionType}
        variantId={variant.id}
        isHovered={isHovered}
        weddingData={curatedWeddingData}
      />

      <div className="relative px-3.5 py-3">
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="block truncate text-[13px] font-semibold text-gray-800">{variant.label}</span>
              <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-semibold ${tone.chip}`}>
                {tone.label}
              </span>
            </div>
            <p className="line-clamp-2 text-[11px] leading-relaxed text-gray-500">{description}</p>
            {sequenceCue && (
              <p className="mt-1 text-[9px] leading-relaxed text-gray-400 line-clamp-2">
                <span className="font-semibold text-gray-500">Photo sequence:</span> {sequenceCue}
              </p>
            )}
            {compositionCue && (
              <p className="mt-0.5 text-[9px] leading-relaxed text-gray-400 line-clamp-2">
                <span className="font-semibold text-gray-500">Composition:</span> {compositionCue}
              </p>
            )}
            {isDefault && (
              <span className="mt-1.5 inline-flex items-center rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--color-accent)]">Default</span>
            )}
          </div>
          <span className={`mt-0.5 flex-shrink-0 transform transition-all duration-200 ${isHovered ? 'translate-x-0 opacity-100' : '-translate-x-1 opacity-0 group-focus-visible:translate-x-0 group-focus-visible:opacity-100'}`}>
            <Plus size={13} className="text-[var(--color-accent)]" />
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[9px] text-gray-400">
          <span>{isHovered ? 'Click to add' : 'Live preview'}</span>
          <span className={`${isHovered ? 'text-[var(--color-accent)]' : 'text-gray-300'} transition-colors`}>{isHovered ? 'Ready to insert' : 'Curated'}</span>
        </div>
      </div>
    </button>
  );
};

class VariantPreviewErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

const BuilderVariantCardPreview: React.FC<{
  sectionType: string;
  variantId: string;
  isHovered: boolean;
  weddingData: WeddingDataV1;
}> = React.memo(({
  sectionType,
  variantId,
  isHovered,
  weddingData,
}) => {
  const typedSectionType = sectionType as BuilderSectionType;
  const fallback = <VariantPreviewSwatch variantId={variantId} sectionType={sectionType} isHovered={isHovered} />;

  if (!hasLivePreviewSupport(typedSectionType, variantId)) {
    return fallback;
  }

  return (
    <VariantPreviewErrorBoundary fallback={fallback}>
      <div className="pointer-events-none relative overflow-hidden bg-white">
        <div className="border-b border-gray-100 bg-gradient-to-r from-white via-gray-50/60 to-white">
          <SectionTypePreview sectionType={sectionType} compact />
        </div>
        <LiveVariantPreview sectionType={typedSectionType} variantId={variantId} weddingData={weddingData} />
        <div className="absolute right-1.5 top-1.5 rounded-md bg-black/48 px-1.5 py-0.5 text-[8px] font-semibold text-white/95 shadow-sm">
          {variantId}
        </div>
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-white/15 transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-70'
          }`}
        />
        <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/8 to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-90' : 'opacity-50'}`} />
      </div>
    </VariantPreviewErrorBoundary>
  );
});

const LiveVariantPreview: React.FC<{ sectionType: BuilderSectionType; variantId: string; weddingData: WeddingDataV1 }> = React.memo(({
  sectionType,
  variantId,
  weddingData,
}) => {
  const section = useMemo(() => {
    const instance = createDefaultSectionInstance(sectionType, variantId, 0);
    instance.settings = buildPreviewSettings(sectionType, variantId);
    return instance;
  }, [sectionType, variantId]);

  return (
    <div className="relative h-20 overflow-hidden bg-white" style={{ contain: 'layout paint size' }}>
      <div className="absolute inset-0 origin-top-left scale-[0.26] transition-transform duration-500 ease-out group-hover:scale-[0.268] group-focus-visible:scale-[0.268]" style={{ width: '384%', minHeight: '260px' }}>
        <div className="h-full w-full saturate-[1.02] contrast-[1.01] transition-[filter] duration-500 ease-out group-hover:saturate-[1.05] group-focus-visible:saturate-[1.05]">
          <SectionRenderer section={section} weddingData={weddingData} isPreview siteSlug="preview" />
        </div>
      </div>
      <div className="absolute inset-0 border-t border-gray-100/80" />
    </div>
  );
});

type SectionHealth = 'empty' | 'draft' | 'ready';

function getSectionHealth(section: BuilderSectionInstance): SectionHealth {
  if (!section.enabled) return 'draft';

  const bindingCount = Object.values(section.bindings ?? {}).reduce((sum, value) => {
    if (Array.isArray(value)) return sum + value.filter(Boolean).length;
    return sum;
  }, 0);

  const meaningfulSettingEntries = Object.entries(section.settings ?? {}).filter(([key, value]) => {
    if (key === 'showTitle') return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'number') return true;
    if (typeof value === 'boolean') return value;
    if (value && typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
    return false;
  }).length;

  const styleCount = Object.keys(section.styleOverrides ?? {}).length;

  const signalScore = bindingCount + meaningfulSettingEntries + styleCount;
  if (signalScore === 0) return 'empty';
  if (signalScore >= 3) return 'ready';
  return 'draft';
}

function getStarterContentPatch(section: BuilderSectionInstance): Partial<BuilderSectionInstance> {
  const now = new Date().toISOString();
  const starterByType: Partial<Record<BuilderSectionType, Record<string, unknown>>> = {
    hero: { title: 'We are getting married', headline: 'Alex & Sam', subtitle: 'January 17, 2027 · Rosewood Estate' },
    story: { title: 'Our Story', content: 'From first coffee to forever — we cannot wait to celebrate with you.' },
    schedule: { title: 'Weekend Schedule' },
    travel: { title: 'Travel & Stay', notes: 'Use the recommended hotels for easiest shuttle access.' },
    registry: { title: 'Registry', message: 'Your presence is the best gift, but here are a few ideas if you wish.' },
    faq: { title: 'FAQ' },
    rsvp: { title: 'RSVP' },
    venue: { title: 'Venue Details' },
    contact: { title: 'Questions?' },
    'footer-cta': { headline: 'Join us for our big day', buttonLabel: 'RSVP' },
  };

  return {
    settings: {
      ...section.settings,
      showTitle: true,
      ...(starterByType[section.type] ?? {}),
    },
    meta: {
      ...section.meta,
      updatedAtISO: now,
    },
  };
}

interface SortableLayerItemProps {
  section: BuilderSectionInstance;
  index: number;
  pageId: string | null;
  isSelected: boolean;
  isDragging: boolean;
}

function scrollToSection(sectionId: string) {
  const el = document.querySelector(`[data-section-id="${sectionId}"]`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

const SortableLayerItem: React.FC<SortableLayerItemProps> = ({ section, index, pageId, isSelected, isDragging }) => {
  const { dispatch } = useBuilderContext();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const manifest = getSectionManifest(section.type);
  const IconComp = SECTION_ICONS[manifest.icon] ?? Layout;
  const health = getSectionHealth(section);
  const healthPill = {
    empty: 'bg-gray-100 text-gray-500',
    draft: 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]',
    ready: 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]',
  }[health];
  const canInsertStarter = health === 'empty' && Boolean(pageId);

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => {
        dispatch(builderActions.selectSection(section.id));
        scrollToSection(section.id);
      }}
      className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer group transition-colors ${
        isSelected
          ? 'bg-[var(--color-accent-soft)] border border-[var(--color-border-subtle)]'
          : 'hover:bg-gray-50 border border-transparent'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={e => e.stopPropagation()}
        className="flex-shrink-0 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing p-0.5 -ml-0.5 transition-colors"
        aria-label="Drag to reorder"
      >
        <GripVertical size={14} />
      </button>

      <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
        isSelected ? 'bg-[var(--color-accent-soft)]' : 'bg-gray-100 group-hover:bg-gray-200'
      }`}>
        <IconComp size={12} className={isSelected ? 'text-[var(--color-accent)]' : 'text-gray-500'} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${isSelected ? 'text-[var(--color-accent)]' : 'text-gray-700'}`}>
          {manifest.label}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <p className="text-[10px] text-gray-400">#{index + 1}</p>
          <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${healthPill}`}>
            {health}
          </span>
          {section.locked && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600">locked</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {canInsertStarter && (
          <button
            onClick={e => {
              e.stopPropagation();
              if (!pageId) return;
              dispatch(builderActions.updateSection(pageId, section.id, getStarterContentPatch(section)));
            }}
            title="Insert starter content"
            className="inline-flex items-center gap-1 rounded bg-[var(--color-accent-soft)] px-1.5 py-1 text-[9px] font-semibold text-[var(--color-accent)] hover:bg-[var(--color-surface-subtle)]"
          >
            <Sparkles size={10} />
            Start
          </button>
        )}
        <button
          onClick={e => {
            e.stopPropagation();
            if (pageId) dispatch(builderActions.toggleSectionVisibility(pageId, section.id));
          }}
          title={section.enabled ? 'Hide' : 'Show'}
          className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {section.enabled ? <Eye size={12} /> : <EyeOff size={12} className="text-[var(--color-accent)]" />}
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            if (section.locked) return;
            setShowDeleteModal(true);
          }}
          title={section.locked ? 'Locked section' : 'Delete section'}
          disabled={section.locked}
          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {!section.enabled && (
        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" title="Hidden" />
      )}

      {showDeleteModal && (
        <DeleteSectionModal
          sectionLabel={manifest.label}
          onConfirm={() => {
            if (pageId) {
              dispatch(builderActions.removeSection(pageId, section.id));
              dispatch(builderActions.selectSection(null));
            }
            setShowDeleteModal(false);
          }}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
};

const LayerItemOverlay: React.FC<{ section: BuilderSectionInstance }> = ({ section }) => {
  const manifest = getSectionManifest(section.type);
  const IconComp = SECTION_ICONS[manifest.icon] ?? Layout;
  return (
    <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-white border border-[var(--color-accent)] shadow-sm w-56 opacity-95">
      <GripVertical size={14} className="text-gray-400 flex-shrink-0" />
      <div className="w-6 h-6 rounded bg-[var(--color-accent-soft)] flex items-center justify-center flex-shrink-0">
        <IconComp size={12} className="text-[var(--color-accent)]" />
      </div>
      <p className="text-xs font-medium text-gray-700 truncate">{manifest.label}</p>
    </div>
  );
};
