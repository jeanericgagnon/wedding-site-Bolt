import React, { useState, useCallback } from 'react';
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
import { selectActivePageSections } from '../state/builderSelectors';
import { CustomSectionSkeleton } from '../../sections/variants/custom/skeletons';

type SidebarTab = 'sections' | 'layers' | 'templates' | 'media';

const SECTION_ICONS: Record<string, LucideIcon> = {
  Image, Heart, MapPin, Clock, Plane, Gift, HelpCircle, Mail, Images,
};

interface BuilderSidebarLibraryProps {
  activePageId: string | null;
}

export const BuilderSidebarLibrary: React.FC<BuilderSidebarLibraryProps> = ({ activePageId }) => {
  const { state, dispatch } = useBuilderContext();
  const [activeTab, setActiveTab] = useState<SidebarTab>('layers');
  const [expandedType, setExpandedType] = useState<BuilderSectionType | null>(null);
  const [showSkeletonPicker, setShowSkeletonPicker] = useState(false);
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

  return (
    <>
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden">
      <div className="flex border-b border-gray-200">
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
                ? 'text-rose-600 border-b-2 border-rose-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'layers' && (
          <div className="p-3">
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {sections.length} {sections.length === 1 ? 'Section' : 'Sections'}
              </p>
              <button
                onClick={() => { setActiveTab('sections'); setExpandedType(null); }}
                className="flex items-center gap-1 text-xs text-rose-600 font-medium hover:text-rose-700 transition-colors"
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 text-white text-xs font-medium rounded-lg hover:bg-rose-600 transition-colors"
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
          <div className="p-3 space-y-1.5">
            <div className="flex items-center gap-2 px-1 mb-2">
              <button
                onClick={() => setActiveTab('layers')}
                className="p-1 -ml-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Back to sections"
              >
                <ArrowLeft size={13} />
              </button>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Add Section
              </p>
            </div>
            {manifests.map(manifest => {
              const isCustom = manifest.type === 'custom';
              return (
                <button
                  key={manifest.type}
                  onClick={() => handleSectionClick(manifest)}
                  className={`w-full text-left rounded-xl border transition-all duration-150 overflow-hidden group ${
                    isCustom
                      ? 'border-amber-200 bg-amber-50/50 hover:border-amber-300 hover:bg-amber-50'
                      : 'border-gray-200 bg-white hover:border-rose-300 hover:shadow-sm'
                  }`}
                >
                  <div className="pointer-events-none">
                    <SectionTypePreview sectionType={manifest.type} />
                  </div>
                  <div className={`flex items-center justify-between px-3 py-2 border-t ${isCustom ? 'border-amber-100' : 'border-gray-100'}`}>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold truncate ${isCustom ? 'text-amber-800' : 'text-gray-700'}`}>{manifest.label}</p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {isCustom ? '8 skeleton layouts' : `${manifest.variantMeta.length} ${manifest.variantMeta.length === 1 ? 'style' : 'styles'}`}
                      </p>
                    </div>
                    <ChevronRight size={13} className={`flex-shrink-0 transition-colors ${isCustom ? 'text-amber-300 group-hover:text-amber-500' : 'text-gray-300 group-hover:text-rose-400'}`} />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'sections' && expandedManifest && (
          <VariantPicker
            manifest={expandedManifest}
            onBack={() => setExpandedType(null)}
            onSelect={(variant) => addSection(expandedManifest.type, variant)}
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
}

const VariantPicker: React.FC<VariantPickerProps> = ({ manifest, onBack, onSelect }) => {
  const [hoveredVariant, setHoveredVariant] = useState<string | null>(null);
  const IconComp = SECTION_ICONS[manifest.icon] ?? Layout;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100">
        <button
          onClick={onBack}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
          aria-label="Back to sections"
        >
          <ArrowLeft size={14} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 bg-rose-50 rounded flex items-center justify-center flex-shrink-0">
            <IconComp size={13} className="text-rose-500" />
          </div>
          <p className="text-sm font-semibold text-gray-700 truncate">{manifest.label}</p>
        </div>
      </div>

      <div className="px-3 pt-3 pb-1.5">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Choose a style</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
        {manifest.variantMeta.map((variant: VariantMeta) => (
          <VariantCard
            key={variant.id}
            variant={variant}
            sectionType={manifest.type}
            isDefault={variant.id === manifest.defaultVariant}
            isHovered={hoveredVariant === variant.id}
            onHover={setHoveredVariant}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
};

interface VariantCardProps {
  variant: VariantMeta;
  sectionType: string;
  isDefault: boolean;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

const VariantCard: React.FC<VariantCardProps> = ({ variant, sectionType, isDefault, isHovered, onHover, onSelect }) => {
  return (
    <button
      onMouseEnter={() => onHover(variant.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(variant.id)}
      className={`w-full text-left rounded-xl border transition-all duration-150 overflow-hidden group ${
        isHovered
          ? 'border-rose-400 shadow-sm'
          : 'border-gray-200 bg-white hover:border-rose-300'
      }`}
    >
      <VariantPreviewSwatch variantId={variant.id} sectionType={sectionType} isHovered={isHovered} />

      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs font-semibold text-gray-700">{variant.label}</span>
          <div className="flex items-center gap-1.5">
            {isDefault && (
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-medium">
                Default
              </span>
            )}
            <span className={`transition-opacity duration-150 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
              <Plus size={13} className="text-rose-500" />
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">{variant.description}</p>
      </div>
    </button>
  );
};

const SectionTypePreview: React.FC<{ sectionType: string }> = ({ sectionType }) => {
  const previews: Record<string, React.ReactNode> = {
    hero: (
      <div className="w-full h-16 relative flex flex-col items-center justify-center bg-slate-700">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative flex flex-col items-center gap-1">
          <div className="text-[7px] text-white/50 uppercase tracking-widest font-medium">We are getting married</div>
          <div className="text-[13px] font-bold text-white">Sarah & James</div>
          <div className="text-[7px] text-white/60">June 14, 2025 · New York</div>
          <div className="mt-0.5 px-2.5 py-0.5 border border-white/40 rounded text-[7px] text-white/80 font-semibold">RSVP Now</div>
        </div>
      </div>
    ),
    story: (
      <div className="w-full h-16 flex bg-gray-50">
        <div className="flex-1 flex flex-col justify-center gap-1 px-3">
          <div className="text-[7px] text-gray-400 uppercase tracking-widest">Our Story</div>
          <div className="h-1 rounded-sm bg-gray-700 w-20" />
          <div className="h-0.5 rounded-sm bg-gray-300 w-full" />
          <div className="h-0.5 rounded-sm bg-gray-300 w-4/5" />
          <div className="h-0.5 rounded-sm bg-gray-300 w-3/5" />
        </div>
        <div className="w-2/5 bg-gray-300" />
      </div>
    ),
    venue: (
      <div className="w-full h-16 flex flex-col bg-white">
        <div className="h-8 w-full relative bg-slate-200">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,0,0,0.08) 4px, rgba(0,0,0,0.08) 5px), repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(0,0,0,0.08) 4px, rgba(0,0,0,0.08) 5px)' }} />
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-red-500 bg-red-400" />
        </div>
        <div className="flex-1 flex items-center gap-2 px-2">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
          <div className="flex-1 h-1 rounded-sm bg-gray-200" />
        </div>
      </div>
    ),
    schedule: (
      <div className="w-full h-16 flex flex-col justify-center px-3 gap-0 bg-gray-50">
        <div className="text-[7px] text-gray-400 uppercase tracking-widest mb-1">Schedule</div>
        {[0,1,2].map(i => (
          <div key={i} className="flex items-start gap-1.5 py-0.5">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-gray-700' : 'bg-gray-300'}`} />
              {i < 2 && <div className="w-px h-2 bg-gray-200" />}
            </div>
            <div className="flex-1 flex items-center gap-1 pt-0.5">
              <div className={`h-1 rounded-sm flex-1 ${i === 0 ? 'bg-gray-600' : 'bg-gray-200'}`} />
              <div className="text-[6px] text-gray-400 font-mono">{['4pm','5pm','7pm'][i]}</div>
            </div>
          </div>
        ))}
      </div>
    ),
    travel: (
      <div className="w-full h-16 flex flex-col justify-center gap-1 px-3 bg-white">
        <div className="text-[7px] text-gray-400 uppercase tracking-widest">Travel & Hotels</div>
        {[0,1].map(i => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
            <div className="flex-1 h-1 rounded-sm bg-gray-200" />
            <div className="w-8 h-3 rounded text-[6px] flex items-center justify-center font-semibold bg-gray-100 text-gray-500 border border-gray-200">BOOK</div>
          </div>
        ))}
      </div>
    ),
    registry: (
      <div className="w-full h-16 flex flex-col justify-center gap-1 px-3 bg-gray-50">
        <div className="text-[7px] text-gray-400 uppercase tracking-widest">Registry</div>
        {[0,1].map(i => (
          <div key={i} className="h-5 rounded-lg flex items-center px-2 gap-2 bg-white border border-gray-200">
            <div className="w-2.5 h-2.5 rounded-sm bg-gray-200 flex-shrink-0" />
            <div className="flex-1 h-1 rounded-sm bg-gray-200" />
            <div className="w-8 h-3 rounded text-[6px] flex items-center justify-center font-semibold bg-gray-700 text-white">View</div>
          </div>
        ))}
      </div>
    ),
    faq: (
      <div className="w-full h-16 flex flex-col justify-center gap-1 px-3 bg-white">
        <div className="text-[7px] text-gray-400 uppercase tracking-widest">FAQ</div>
        {[0,1,2].map(i => (
          <div key={i} className="flex items-center justify-between px-1.5 py-0.5 rounded border border-gray-100 bg-gray-50">
            <div className={`h-1.5 rounded-sm ${i === 0 ? 'w-20 bg-gray-600' : 'w-16 bg-gray-300'}`} />
            <div className="text-[9px] font-bold text-gray-400">{i === 0 ? '−' : '+'}</div>
          </div>
        ))}
      </div>
    ),
    rsvp: (
      <div className="w-full h-16 flex flex-col justify-center gap-1 px-3 bg-gray-50">
        <div className="h-4 rounded-md border border-gray-200 bg-white flex items-center px-2">
          <div className="flex-1 h-0.5 rounded-sm bg-gray-200" />
        </div>
        <div className="flex gap-1">
          <div className="flex-1 h-4 rounded-md border border-gray-200 bg-white flex items-center px-1.5 gap-1">
            <div className="w-1 h-1 rounded-full bg-gray-300" />
            <div className="text-[6px] text-gray-500 font-medium">Yes</div>
          </div>
          <div className="flex-1 h-4 rounded-md border border-gray-200 bg-white flex items-center px-1.5 gap-1">
            <div className="w-1 h-1 rounded-full bg-gray-300" />
            <div className="text-[6px] text-gray-400 font-medium">No</div>
          </div>
        </div>
        <div className="h-4 rounded-md bg-gray-700 flex items-center justify-center">
          <div className="text-[7px] text-white font-semibold">SEND RSVP</div>
        </div>
      </div>
    ),
    gallery: (
      <div className="w-full h-16 flex items-start gap-0.5 px-1.5 pt-1.5 pb-1 bg-gray-50">
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="h-7 rounded-sm bg-gray-300" />
          <div className="h-4 rounded-sm bg-gray-200" />
        </div>
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="h-4 rounded-sm bg-gray-200" />
          <div className="h-6 rounded-sm bg-gray-300" />
        </div>
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="h-5 rounded-sm bg-gray-300" />
          <div className="h-5 rounded-sm bg-gray-200" />
        </div>
      </div>
    ),
    countdown: (
      <div className="w-full h-16 flex flex-col items-center justify-center gap-1 bg-gray-50">
        <div className="text-[7px] text-gray-400 uppercase tracking-widest">Counting down to</div>
        <div className="flex items-end gap-1.5">
          {[{n:'47',l:'Days'},{n:'12',l:'Hrs'},{n:'38',l:'Min'}].map(({n,l}) => (
            <div key={l} className="flex flex-col items-center">
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold bg-gray-800 text-white">{n}</div>
              <div className="text-[5px] mt-0.5 text-gray-400 font-medium">{l}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    'wedding-party': (
      <div className="w-full h-16 flex flex-col justify-center gap-1 px-2 bg-gray-50">
        <div className="text-[7px] text-gray-400 uppercase tracking-widest text-center">Wedding Party</div>
        <div className="flex justify-center gap-1.5">
          {[0,1,2,3].map(i => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div className={`w-6 h-6 rounded-full ${i < 2 ? 'bg-gray-300' : 'bg-gray-200'}`} />
              <div className="w-5 h-0.5 rounded-sm bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    ),
    'dress-code': (
      <div className="w-full h-16 flex bg-gray-50">
        <div className="w-1 h-full bg-gray-500" />
        <div className="flex-1 flex flex-col justify-center gap-0.5 px-2">
          <div className="text-[6px] text-gray-400 uppercase tracking-widest">What to wear</div>
          <div className="text-[10px] font-bold text-gray-800">Black Tie</div>
          <div className="h-0.5 rounded-sm bg-gray-300 w-full" />
          <div className="h-0.5 rounded-sm bg-gray-200 w-4/5" />
        </div>
        <div className="w-10 flex items-center justify-center pr-1">
          <div className="w-7 h-8 rounded-sm bg-gray-200 border border-gray-300 flex items-end justify-center pb-0.5">
            <div className="w-3.5 h-5 rounded-t-full bg-gray-300" />
          </div>
        </div>
      </div>
    ),
    accommodations: (
      <div className="w-full h-16 flex flex-col justify-center gap-1 px-3 bg-white">
        <div className="text-[7px] text-gray-400 uppercase tracking-widest">Accommodations</div>
        {[0,1].map(i => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-sm bg-gray-300 flex-shrink-0" />
            <div className="flex-1 h-1 rounded-sm bg-gray-200" />
            <div className="w-8 h-3 rounded text-[6px] flex items-center justify-center font-semibold bg-gray-100 text-gray-500 border border-gray-200">Book</div>
          </div>
        ))}
      </div>
    ),
    contact: (
      <div className="w-full h-16 flex flex-col justify-center gap-1 px-3 bg-white">
        <div className="text-[7px] text-gray-400 uppercase tracking-widest">Questions?</div>
        <div className="flex gap-2">
          {[0,1].map(i => (
            <div key={i} className="flex-1 h-8 rounded-lg p-1.5 flex flex-col gap-0.5 bg-gray-50 border border-gray-100">
              <div className="w-3 h-3 rounded-full bg-gray-200" />
              <div className="h-0.5 rounded-sm bg-gray-300 w-full" />
            </div>
          ))}
        </div>
      </div>
    ),
    'footer-cta': (
      <div className="w-full h-16 flex flex-col items-center justify-center gap-1 bg-gray-800">
        <div className="text-[7px] text-white/50">We hope to see you there</div>
        <div className="text-[10px] font-bold text-white">Sarah & James</div>
        <div className="px-3 py-0.5 border border-white/30 rounded-full text-[7px] text-white/70 font-semibold">RSVP Now</div>
      </div>
    ),
    custom: (
      <div className="w-full h-16 bg-amber-50 flex flex-col px-2.5 pt-2 pb-1.5 gap-1.5">
        <div className="flex items-center gap-1.5">
          <div className="h-2 rounded-sm bg-amber-400 w-14" />
          <div className="h-1 rounded-sm bg-amber-200 flex-1" />
        </div>
        <div className="flex gap-1.5 flex-1">
          <div className="flex-1 flex flex-col gap-1 border border-dashed border-amber-300 rounded p-1">
            <div className="h-1 rounded-sm bg-amber-300 w-full" />
            <div className="h-1 rounded-sm bg-amber-200 w-3/4" />
            <div className="mt-auto h-2 rounded bg-amber-400 w-8" />
          </div>
          <div className="flex-1 flex flex-col gap-1 border border-dashed border-amber-300 rounded p-1">
            <div className="h-2.5 rounded-sm bg-amber-200 w-full" />
            <div className="h-1 rounded-sm bg-amber-200 w-full" />
            <div className="h-1 rounded-sm bg-amber-200 w-2/3" />
          </div>
          <div className="flex-1 flex flex-col gap-1 border border-dashed border-amber-300 rounded p-1">
            <div className="text-[9px] font-black text-amber-600 leading-none">42</div>
            <div className="h-1 rounded-sm bg-amber-300 w-full" />
            <div className="h-1 rounded-sm bg-amber-200 w-3/4" />
          </div>
        </div>
      </div>
    ),
  };

  const preview = previews[sectionType];
  if (preview) return <>{preview}</>;
  return <div className="w-full h-16 bg-gray-100" />;
};

const VariantPreviewSwatch: React.FC<{ variantId: string; sectionType?: string; isHovered: boolean }> = ({ variantId, sectionType, isHovered }) => {
  const h = isHovered;
  const c = h ? 'bg-rose-200' : 'bg-gray-200';
  const cd = h ? 'bg-rose-300' : 'bg-gray-300';
  const cl = h ? 'bg-rose-100' : 'bg-gray-100';

  const swatches: Record<string, React.ReactNode> = {

    /* ── HERO ── */
    hero_default: (
      <div className={`w-full h-20 relative flex flex-col items-center justify-center gap-1.5 transition-colors ${h ? 'bg-rose-900' : 'bg-slate-700'}`}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative flex flex-col items-center gap-1.5 w-full px-4">
          <div className="w-28 h-2.5 bg-white/90 rounded-sm" />
          <div className="w-20 h-1.5 bg-white/60 rounded-sm" />
          <div className="w-12 h-5 mt-1 bg-white/20 border border-white/40 rounded text-[8px] text-white/80 flex items-center justify-center font-medium">RSVP</div>
        </div>
      </div>
    ),
    hero_minimal: (
      <div className={`w-full h-20 flex flex-col items-center justify-center gap-1.5 transition-colors bg-white`}>
        <div className="w-4 h-4 rounded-full border-2 border-rose-300 flex items-center justify-center mb-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-300" />
        </div>
        <div className={`w-28 h-2.5 rounded-sm ${h ? 'bg-rose-400' : 'bg-gray-800'}`} />
        <div className={`w-20 h-1.5 rounded-sm ${h ? 'bg-rose-200' : 'bg-gray-300'}`} />
        <div className={`w-16 h-1 rounded-sm ${h ? 'bg-rose-100' : 'bg-gray-200'}`} />
      </div>
    ),
    hero_fullbleed: (
      <div className={`w-full h-20 relative flex items-end transition-colors ${h ? 'bg-rose-900' : 'bg-gray-800'}`}>
        <div className={`absolute inset-0 ${h ? 'bg-rose-950/50' : 'bg-black/50'}`} />
        <div className="relative w-full px-3 pb-3">
          <div className="w-24 h-3 bg-white rounded-sm mb-1.5" />
          <div className="w-16 h-1.5 bg-white/60 rounded-sm" />
        </div>
      </div>
    ),

    /* ── STORY ── */
    story_default: (
      <div className={`w-full h-20 flex transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className="flex-1 flex flex-col justify-center gap-1.5 px-3">
          <div className={`w-16 h-1.5 rounded-sm ${cd}`} />
          <div className={`h-1 rounded-sm ${c}`} />
          <div className={`h-1 rounded-sm w-4/5 ${c}`} />
          <div className={`h-1 rounded-sm w-3/5 ${c}`} />
        </div>
        <div className={`w-2/5 h-full ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
      </div>
    ),
    story_centered: (
      <div className={`w-full h-20 flex flex-col items-center justify-center gap-1.5 px-4 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`w-10 h-10 rounded-full ${c}`} />
        <div className={`w-20 h-1.5 rounded-sm ${cd}`} />
        <div className={`w-full h-1 rounded-sm ${c}`} />
        <div className={`w-4/5 h-1 rounded-sm ${c}`} />
      </div>
    ),
    story_split: (
      <div className={`w-full h-20 flex transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`w-1/2 h-full ${h ? 'bg-rose-200' : 'bg-gray-300'}`} />
        <div className="w-1/2 flex flex-col justify-center gap-1.5 px-2.5">
          <div className={`w-3 h-3 rounded-full ${h ? 'bg-rose-300' : 'bg-gray-300'} mb-0.5`} />
          <div className={`h-1.5 rounded-sm ${cd}`} />
          <div className={`h-1 rounded-sm ${c}`} />
          <div className={`h-1 rounded-sm w-4/5 ${c}`} />
          <div className={`h-1 rounded-sm w-3/5 ${c}`} />
        </div>
      </div>
    ),

    /* ── VENUE ── */
    venue_card: (
      <div className={`w-full h-20 flex items-center gap-1.5 px-2 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        {[0, 1].map(i => (
          <div key={i} className={`flex-1 h-16 rounded-lg overflow-hidden flex flex-col ${h ? 'bg-white shadow-sm ring-1 ring-rose-200' : 'bg-white border border-gray-200'}`}>
            <div className={`h-7 w-full ${i === 0 ? (h ? 'bg-rose-200' : 'bg-gray-200') : (h ? 'bg-rose-100' : 'bg-gray-100')}`} />
            <div className="px-1.5 pt-1 flex flex-col gap-0.5">
              <div className={`h-1.5 rounded-sm w-4/5 ${cd}`} />
              <div className="flex items-center gap-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${c}`} />
                <div className={`flex-1 h-1 rounded-sm ${cl}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    ),
    venue_mapFirst: (
      <div className={`w-full h-20 flex flex-col transition-colors`}>
        <div className={`h-12 w-full relative ${h ? 'bg-rose-100' : 'bg-slate-200'}`}>
          <div className={`absolute inset-0 opacity-30 ${h ? 'bg-rose-300' : 'bg-slate-400'}`} style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,0,0,0.07) 4px, rgba(0,0,0,0.07) 5px), repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(0,0,0,0.07) 4px, rgba(0,0,0,0.07) 5px)' }} />
          <div className={`absolute top-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 ${h ? 'border-rose-500 bg-rose-400' : 'border-red-500 bg-red-400'}`} />
        </div>
        <div className={`flex-1 flex items-center gap-2 px-2 ${h ? 'bg-rose-50' : 'bg-white'}`}>
          <div className={`h-1.5 rounded-sm flex-1 ${c}`} />
          <div className={`h-1.5 rounded-sm w-10 ${cd}`} />
        </div>
      </div>
    ),
    venue_splitMap: (
      <div className={`w-full h-20 flex transition-colors`}>
        <div className="flex-1 flex flex-col justify-center gap-1.5 px-2.5 bg-white">
          <div className={`w-3 h-3 rounded-full ${h ? 'bg-rose-400' : 'bg-gray-400'} mb-0.5`} />
          <div className={`h-1.5 rounded-sm ${cd}`} />
          <div className={`h-1 rounded-sm ${c}`} />
          <div className={`h-1 rounded-sm w-3/4 ${c}`} />
        </div>
        <div className={`w-2/5 h-full relative ${h ? 'bg-rose-100' : 'bg-slate-200'}`}>
          <div className={`absolute inset-0 opacity-25`} style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 5px, rgba(0,0,0,0.1) 5px, rgba(0,0,0,0.1) 6px), repeating-linear-gradient(90deg, transparent, transparent 5px, rgba(0,0,0,0.1) 5px, rgba(0,0,0,0.1) 6px)' }} />
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 ${h ? 'border-rose-500 bg-rose-400' : 'border-red-400 bg-red-300'}`} />
        </div>
      </div>
    ),
    venue_detailsFirst: (
      <div className={`w-full h-20 flex flex-col justify-center gap-1.5 px-3 transition-colors bg-white`}>
        <div className={`h-1.5 rounded-sm w-20 ${cd}`} />
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-0.5">
          {[0,1,2,3].map(i => (
            <div key={i} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-sm flex-shrink-0 ${c}`} />
              <div className={`flex-1 h-1 rounded-sm ${cl}`} />
            </div>
          ))}
        </div>
      </div>
    ),

    /* ── SCHEDULE ── */
    schedule_timeline: (
      <div className={`w-full h-20 flex flex-col justify-center px-3 gap-0 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        {[0,1,2].map(i => (
          <div key={i} className="flex items-start gap-2 py-1">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-2.5 h-2.5 rounded-full ${i === 0 ? (h ? 'bg-rose-500' : 'bg-gray-600') : c}`} />
              {i < 2 && <div className={`w-0.5 h-3 ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />}
            </div>
            <div className="flex-1 space-y-0.5 pt-0.5">
              <div className={`h-1.5 rounded-sm w-10 ${cd}`} />
              <div className={`h-1 rounded-sm w-16 ${cl}`} />
            </div>
            <div className={`text-[8px] font-mono ${h ? 'text-rose-400' : 'text-gray-400'} pt-0.5 flex-shrink-0`}>4:00</div>
          </div>
        ))}
      </div>
    ),
    schedule_dayTabs: (
      <div className={`w-full h-20 flex flex-col transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className="flex border-b border-gray-200 px-2 pt-1.5 gap-1">
          {['Fri','Sat','Sun'].map((d, i) => (
            <div key={d} className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-t-sm ${i === 1 ? (h ? 'bg-rose-500 text-white' : 'bg-gray-700 text-white') : (h ? 'text-rose-400' : 'text-gray-400')}`}>{d}</div>
          ))}
        </div>
        <div className="flex-1 px-3 py-2 space-y-1">
          {[0,1].map(i => (
            <div key={i} className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c}`} />
              <div className={`flex-1 h-1 rounded-sm ${cl}`} />
              <div className={`text-[7px] ${h ? 'text-rose-400' : 'text-gray-400'}`}>2pm</div>
            </div>
          ))}
        </div>
      </div>
    ),
    schedule_agendaCards: (
      <div className={`w-full h-20 flex items-center gap-1 px-2 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        {[0,1,2].map(i => (
          <div key={i} className={`flex-1 h-14 rounded-lg flex flex-col justify-between p-1.5 ${h ? 'bg-white ring-1 ring-rose-200' : 'bg-white border border-gray-200'}`}>
            <div>
              <div className={`text-[7px] font-semibold mb-0.5 ${h ? 'text-rose-400' : 'text-gray-400'}`}>3:00 PM</div>
              <div className={`h-1.5 rounded-sm ${cd}`} />
            </div>
            <div className={`h-1 rounded-sm w-2/3 ${c}`} />
          </div>
        ))}
      </div>
    ),

    /* ── TRAVEL ── */
    travel_list: (
      <div className={`w-full h-20 flex flex-col justify-center gap-1.5 px-3 transition-colors bg-white`}>
        <div className={`h-1.5 rounded-sm w-16 ${cd}`} />
        {[0,1,2].map(i => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${h ? 'bg-rose-300' : 'bg-gray-300'}`} />
            <div className={`flex-1 h-1 rounded-sm ${c}`} />
            <div className={`w-8 h-1 rounded-sm ${cl}`} />
          </div>
        ))}
      </div>
    ),
    travel_hotelBlock: (
      <div className={`w-full h-20 flex items-center gap-1.5 px-2 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        {[0,1].map(i => (
          <div key={i} className={`flex-1 h-16 rounded-lg overflow-hidden flex flex-col ${h ? 'bg-white ring-1 ring-rose-200' : 'bg-white border border-gray-200'}`}>
            <div className={`h-6 ${h ? 'bg-rose-100' : 'bg-slate-100'}`} />
            <div className="p-1.5 flex flex-col gap-0.5">
              <div className={`h-1.5 rounded-sm ${cd}`} />
              <div className="flex items-center gap-0.5 mt-0.5">
                <div className={`w-7 h-3.5 rounded text-[6px] flex items-center justify-center font-bold ${h ? 'bg-rose-100 text-rose-600 border border-rose-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>BOOK</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    ),

    /* ── REGISTRY ── */
    registry_cards: (
      <div className={`w-full h-20 flex flex-col justify-center px-3 gap-1.5 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`h-1.5 rounded-sm w-14 ${cd}`} />
        {[0,1].map(i => (
          <div key={i} className={`h-6 rounded-lg flex items-center px-2 gap-2 ${h ? 'bg-white ring-1 ring-rose-200' : 'bg-white border border-gray-200'}`}>
            <div className={`w-3 h-3 rounded-sm flex-shrink-0 ${c}`} />
            <div className={`flex-1 h-1 rounded-sm ${c}`} />
            <div className={`w-10 h-3 rounded text-[7px] flex items-center justify-center font-semibold ${h ? 'bg-rose-500 text-white' : 'bg-gray-700 text-white'}`}>View</div>
          </div>
        ))}
      </div>
    ),
    registry_featured: (
      <div className={`w-full h-20 flex items-center gap-1 px-2 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        {[0,1,2].map((i) => (
          <div key={i} className={`flex-1 h-16 rounded-lg overflow-hidden flex flex-col ${h ? 'bg-white ring-1 ring-rose-200' : 'bg-white border border-gray-200'} ${i === 1 ? 'scale-105' : ''}`}>
            <div className={`h-8 ${h ? 'bg-rose-100' : 'bg-gray-100'} flex items-center justify-center`}>
              <div className={`w-3 h-3 rounded-sm ${c}`} />
            </div>
            <div className="p-1 flex flex-col gap-0.5">
              <div className={`h-1 rounded-sm ${cd}`} />
              <div className={`h-1 rounded-sm w-2/3 ${cl}`} />
            </div>
          </div>
        ))}
      </div>
    ),

    /* ── FAQ ── */
    faq_default: (
      <div className={`w-full h-20 flex flex-col justify-center gap-2 px-3 transition-colors bg-white`}>
        <div className={`h-1.5 rounded-sm w-12 ${cd}`} />
        {[0,1].map(i => (
          <div key={i} className="space-y-0.5">
            <div className={`h-1.5 rounded-sm w-24 ${cd}`} />
            <div className={`h-1 rounded-sm w-full ${cl}`} />
            <div className={`h-1 rounded-sm w-4/5 ${cl}`} />
          </div>
        ))}
      </div>
    ),
    faq_accordion: (
      <div className={`w-full h-20 flex flex-col justify-center gap-1.5 px-3 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`h-1.5 rounded-sm w-10 ${cd}`} />
        {[0,1,2].map((i) => (
          <div key={i} className={`flex items-center justify-between px-2 py-1 rounded-md border transition-colors ${i === 0 ? (h ? 'border-rose-300 bg-rose-100' : 'border-gray-300 bg-white') : (h ? 'border-rose-100 bg-rose-50' : 'border-gray-100 bg-white')}`}>
            <div className={`h-1.5 w-20 rounded-sm ${i === 0 ? cd : c}`} />
            <div className={`text-[10px] font-bold ${h ? 'text-rose-400' : 'text-gray-400'}`}>{i === 0 ? '−' : '+'}</div>
          </div>
        ))}
      </div>
    ),

    /* ── RSVP ── */
    rsvp_default: (
      <div className={`w-full h-20 flex flex-col justify-center gap-1.5 px-3 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`h-1.5 rounded-sm w-10 ${cd}`} />
        <div className={`h-5 rounded-md border ${h ? 'border-rose-200 bg-white' : 'border-gray-200 bg-white'} flex items-center px-2`}>
          <div className={`flex-1 h-1 rounded-sm ${cl}`} />
        </div>
        <div className="flex gap-1">
          <div className={`flex-1 h-5 rounded-md border flex items-center px-1.5 gap-1 ${h ? 'border-rose-200 bg-white' : 'border-gray-200 bg-white'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${h ? 'bg-rose-300' : 'bg-gray-300'}`} />
            <div className={`text-[7px] ${h ? 'text-rose-500' : 'text-gray-500'} font-medium`}>Yes</div>
          </div>
          <div className={`flex-1 h-5 rounded-md border flex items-center px-1.5 gap-1 ${h ? 'border-rose-200 bg-white' : 'border-gray-200 bg-white'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${c}`} />
            <div className={`text-[7px] ${h ? 'text-rose-400' : 'text-gray-400'} font-medium`}>No</div>
          </div>
        </div>
        <div className={`h-5 rounded-md flex items-center justify-center ${h ? 'bg-rose-500' : 'bg-gray-700'}`}>
          <div className="text-[8px] text-white font-semibold tracking-wide">SEND RSVP</div>
        </div>
      </div>
    ),
    rsvp_inline: (
      <div className={`w-full h-20 flex items-center px-2 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`w-full h-11 rounded-xl border flex items-center px-2.5 gap-2 ${h ? 'border-rose-200 bg-white' : 'border-gray-200 bg-white'}`}>
          <div className="flex-1 flex flex-col gap-0.5">
            <div className={`h-1.5 rounded-sm w-16 ${cd}`} />
            <div className={`h-4 rounded-md border w-full ${h ? 'border-rose-100' : 'border-gray-100'}`} />
          </div>
          <div className={`w-14 h-7 rounded-lg flex items-center justify-center ${h ? 'bg-rose-500' : 'bg-gray-700'}`}>
            <div className="text-[7px] text-white font-bold">RSVP</div>
          </div>
        </div>
      </div>
    ),

    /* ── GALLERY ── */
    gallery_masonry: (
      <div className={`w-full h-20 flex items-start gap-0.5 px-1.5 pt-1.5 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className="flex-1 flex flex-col gap-0.5">
          <div className={`h-8 rounded-sm ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
          <div className={`h-5 rounded-sm ${h ? 'bg-rose-300' : 'bg-gray-300'}`} />
        </div>
        <div className="flex-1 flex flex-col gap-0.5">
          <div className={`h-5 rounded-sm ${h ? 'bg-rose-300' : 'bg-gray-300'}`} />
          <div className={`h-7 rounded-sm ${h ? 'bg-rose-100' : 'bg-gray-100'}`} />
        </div>
        <div className="flex-1 flex flex-col gap-0.5">
          <div className={`h-6 rounded-sm ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
          <div className={`h-6 rounded-sm ${h ? 'bg-rose-300' : 'bg-gray-300'}`} />
        </div>
      </div>
    ),
    gallery_grid: (
      <div className={`w-full h-20 flex flex-col items-center justify-center transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className="grid grid-cols-3 gap-0.5 w-full px-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`aspect-square rounded-sm ${i % 2 === 0 ? (h ? 'bg-rose-200' : 'bg-gray-200') : (h ? 'bg-rose-300' : 'bg-gray-300')}`} />
          ))}
        </div>
      </div>
    ),
    gallery_filmStrip: (
      <div className={`w-full h-20 flex flex-col gap-0.5 p-1.5 transition-colors ${h ? 'bg-gray-900' : 'bg-gray-800'}`}>
        <div className={`flex-1 rounded-sm ${h ? 'bg-rose-300/70' : 'bg-gray-500'}`} />
        <div className="flex gap-0.5">
          {[0,1,2,3,4].map(i => (
            <div key={i} className={`flex-1 h-4 rounded-sm ${i === 2 ? (h ? 'bg-rose-300/80 ring-1 ring-rose-400' : 'bg-gray-400 ring-1 ring-white/20') : (h ? 'bg-gray-600' : 'bg-gray-600')}`} />
          ))}
        </div>
      </div>
    ),
    gallery_polaroid: (
      <div className={`w-full h-20 flex items-center justify-center gap-1 transition-colors ${h ? 'bg-amber-50' : 'bg-stone-100'}`}>
        {[{r:-6,w:22},{r:3,w:26},{r:-3,w:22}].map(({r,w}, i) => (
          <div
            key={i}
            className="bg-white shadow-md flex-shrink-0"
            style={{ transform: `rotate(${r}deg)`, padding: '3px 3px 9px 3px', width: `${w}px` }}
          >
            <div className={`w-full aspect-square ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
          </div>
        ))}
      </div>
    ),

    /* ── COUNTDOWN ── */
    countdown_default: (
      <div className={`w-full h-20 flex flex-col items-center justify-center gap-1.5 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`text-[8px] font-medium ${h ? 'text-rose-400' : 'text-gray-400'} tracking-widest uppercase`}>Counting down to</div>
        <div className="flex items-end gap-1.5">
          {[{n:'047',l:'Days'},{n:'12',l:'Hrs'},{n:'38',l:'Min'}].map(({n,l}) => (
            <div key={l} className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold ${h ? 'bg-rose-500 text-white' : 'bg-gray-800 text-white'}`}>{n.slice(-2)}</div>
              <div className={`text-[6px] mt-0.5 ${h ? 'text-rose-400' : 'text-gray-400'} font-medium`}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    countdown_banner: (
      <div className={`w-full h-20 flex items-center justify-center transition-colors ${h ? 'bg-rose-500' : 'bg-gray-800'}`}>
        <div className="flex items-center gap-3">
          <div className="text-[8px] text-white/70 font-medium">Until the big day</div>
          <div className="flex items-center gap-1">
            {['47d','12h','38m'].map(t => (
              <div key={t} className="bg-white/20 rounded px-1 py-0.5">
                <span className="text-[9px] text-white font-bold">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),

    /* ── WEDDING PARTY ── */
    'wedding-party_default': (
      <div className={`w-full h-20 flex flex-col justify-center gap-1.5 px-2 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`h-1.5 rounded-sm w-16 mx-auto ${cd}`} />
        <div className="flex justify-center gap-1">
          {[0,1,2,3].map(i => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div className={`w-7 h-7 rounded-full ${i < 2 ? (h ? 'bg-rose-200' : 'bg-gray-200') : (h ? 'bg-rose-300' : 'bg-gray-300')}`} />
              <div className={`w-6 h-1 rounded-sm ${c}`} />
            </div>
          ))}
        </div>
      </div>
    ),
    'wedding-party_grid': (
      <div className={`w-full h-20 flex flex-col justify-center gap-1.5 px-2 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`h-1.5 rounded-sm w-16 mx-auto ${cd}`} />
        <div className="grid grid-cols-5 gap-1 px-1">
          {[0,1,2,3,4].map(i => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div className={`w-full aspect-square rounded-full ${i % 3 === 0 ? (h ? 'bg-rose-300' : 'bg-gray-300') : (h ? 'bg-rose-200' : 'bg-gray-200')}`} />
              <div className={`w-full h-1 rounded-sm ${cl}`} />
            </div>
          ))}
        </div>
      </div>
    ),

    /* ── DRESS CODE ── */
    'dress-code_default': (
      <div className={`w-full h-20 flex transition-colors ${h ? 'bg-stone-50' : 'bg-gray-50'}`}>
        <div className={`w-1.5 h-full ${h ? 'bg-rose-400' : 'bg-gray-400'}`} />
        <div className="flex-1 flex flex-col justify-center gap-1.5 px-3">
          <div className={`text-[7px] font-semibold uppercase tracking-widest ${h ? 'text-rose-400' : 'text-gray-400'}`}>What to wear</div>
          <div className={`text-[10px] font-bold ${h ? 'text-rose-700' : 'text-gray-700'}`}>Black Tie</div>
          <div className={`h-1 rounded-sm w-full ${c}`} />
          <div className={`h-1 rounded-sm w-4/5 ${c}`} />
        </div>
        <div className="w-12 flex flex-col items-center justify-center gap-1 pr-2">
          <div className={`w-8 h-10 rounded-sm ${h ? 'bg-rose-100 border border-rose-200' : 'bg-gray-100 border border-gray-200'} flex items-end justify-center pb-1`}>
            <div className={`w-4 h-6 rounded-t-full border-b-0 ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
          </div>
        </div>
      </div>
    ),
    'dress-code_banner': (
      <div className={`w-full h-20 flex items-center justify-between px-4 transition-colors ${h ? 'bg-rose-900' : 'bg-gray-900'}`}>
        <div className="flex flex-col gap-1">
          <div className={`text-[7px] uppercase tracking-widest ${h ? 'text-rose-300' : 'text-gray-400'}`}>Dress Code</div>
          <div className="text-[11px] font-bold text-white">Black Tie</div>
        </div>
        <div className={`w-px h-8 ${h ? 'bg-rose-700' : 'bg-gray-700'}`} />
        <div className={`text-[8px] text-right ${h ? 'text-rose-300' : 'text-gray-400'} max-w-16 leading-tight`}>Formal attire required</div>
      </div>
    ),

    /* ── ACCOMMODATIONS ── */
    accommodations_default: (
      <div className={`w-full h-20 flex flex-col justify-center gap-1.5 px-3 transition-colors bg-white`}>
        <div className={`h-1.5 rounded-sm w-20 ${cd}`} />
        {[0,1].map(i => (
          <div key={i} className="flex items-start gap-1.5">
            <div className={`w-2 h-2 rounded-sm flex-shrink-0 mt-0.5 ${c}`} />
            <div className="flex-1 space-y-0.5">
              <div className={`h-1.5 rounded-sm ${cd}`} />
              <div className={`h-1 rounded-sm w-3/4 ${cl}`} />
            </div>
            <div className={`w-10 h-4 rounded text-[7px] flex items-center justify-center font-semibold flex-shrink-0 ${h ? 'bg-rose-100 text-rose-600 border border-rose-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>Book</div>
          </div>
        ))}
      </div>
    ),
    accommodations_cards: (
      <div className={`w-full h-20 flex items-center gap-1.5 px-2 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        {[0,1].map(i => (
          <div key={i} className={`flex-1 h-16 rounded-lg overflow-hidden flex flex-col ${h ? 'bg-white ring-1 ring-rose-200' : 'bg-white border border-gray-200'}`}>
            <div className={`h-5 ${h ? 'bg-rose-100' : 'bg-slate-100'}`} />
            <div className="p-1.5 flex flex-col gap-0.5">
              <div className={`h-1.5 rounded-sm ${cd}`} />
              <div className={`h-1 rounded-sm w-2/3 ${cl}`} />
              <div className={`mt-0.5 h-3 rounded text-[6px] flex items-center justify-center font-bold w-full ${h ? 'bg-rose-100 text-rose-600 border border-rose-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>BOOK NOW</div>
            </div>
          </div>
        ))}
      </div>
    ),

    /* ── CONTACT ── */
    contact_default: (
      <div className={`w-full h-20 flex flex-col justify-center gap-1.5 px-3 transition-colors bg-white`}>
        <div className={`h-1.5 rounded-sm w-14 ${cd}`} />
        <div className="flex gap-2">
          {[0,1].map(i => (
            <div key={i} className={`flex-1 h-10 rounded-lg p-1.5 flex flex-col gap-0.5 ${h ? 'bg-rose-50 border border-rose-100' : 'bg-gray-50 border border-gray-100'}`}>
              <div className={`w-4 h-4 rounded-full ${c}`} />
              <div className={`h-1 rounded-sm ${cd}`} />
              <div className={`h-1 rounded-sm w-3/4 ${cl}`} />
            </div>
          ))}
        </div>
      </div>
    ),
    contact_minimal: (
      <div className={`w-full h-20 flex flex-col items-center justify-center gap-1.5 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`h-1.5 rounded-sm w-16 ${cd}`} />
        <div className={`h-1 rounded-sm w-24 ${c}`} />
        <div className={`flex items-center gap-3 mt-1`}>
          {[0,1,2].map(i => (
            <div key={i} className={`flex items-center gap-0.5`}>
              <div className={`w-2 h-2 rounded-full ${c}`} />
              <div className={`h-1 rounded-sm w-8 ${cl}`} />
            </div>
          ))}
        </div>
      </div>
    ),

    /* ── FOOTER CTA ── */
    'footer-cta_default': (
      <div className={`w-full h-20 flex flex-col items-center justify-center gap-1.5 transition-colors ${h ? 'bg-rose-600' : 'bg-gray-800'}`}>
        <div className="text-[8px] text-white/60 font-medium">We hope to see you there</div>
        <div className="text-[11px] text-white font-bold">Sarah & James</div>
        <div className={`mt-0.5 px-4 py-1 rounded-full border border-white/40 text-[8px] text-white font-semibold`}>RSVP Now</div>
      </div>
    ),
    'footer-cta_minimal': (
      <div className={`w-full h-20 flex flex-col items-center justify-center gap-1.5 transition-colors bg-white`}>
        <div className={`h-px w-12 ${h ? 'bg-rose-200' : 'bg-gray-200'} mb-1`} />
        <div className={`text-[9px] font-semibold ${h ? 'text-rose-600' : 'text-gray-700'}`}>Join us on our big day</div>
        <div className={`px-4 py-1 rounded-full text-[8px] font-semibold ${h ? 'bg-rose-100 text-rose-600 border border-rose-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>RSVP Now</div>
        <div className={`h-px w-12 ${h ? 'bg-rose-200' : 'bg-gray-200'} mt-1`} />
      </div>
    ),

    /* ── CUSTOM ── */
    custom_default: (
      <div className={`w-full h-20 flex flex-col items-center justify-center gap-1.5 transition-colors ${h ? 'bg-amber-50' : 'bg-gray-50'}`}>
        <div className="flex gap-1 mb-0.5">
          {['H','P','B'].map(t => (
            <div key={t} className={`text-[7px] font-bold px-1.5 py-0.5 rounded ${h ? 'bg-amber-200 text-amber-700' : 'bg-gray-200 text-gray-500'}`}>{t}</div>
          ))}
        </div>
        <div className={`h-1.5 rounded-sm w-20 ${h ? 'bg-amber-300' : 'bg-gray-300'}`} />
        <div className={`h-1 rounded-sm w-full mx-4 ${h ? 'bg-amber-200' : 'bg-gray-200'}`} />
        <div className={`h-5 rounded-md w-12 ${h ? 'bg-amber-400' : 'bg-gray-400'} mt-0.5`} />
      </div>
    ),

    /* ── LEGACY FALLBACKS (single-word ids without type prefix) ── */
    default: (
      <div className={`w-full h-20 flex items-center gap-2 px-3 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`flex-1 h-2 rounded ${cd}`} />
        <div className={`w-10 h-2 rounded ${c}`} />
      </div>
    ),
  };

  const key = `${sectionType ?? ''}_${variantId}`;
  const swatch = swatches[key] ?? swatches[variantId];
  if (swatch) return <>{swatch}</>;
  return <div className={`w-full h-20 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-100'}`} />;
};

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
          ? 'bg-rose-50 border border-rose-200'
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
        isSelected ? 'bg-rose-100' : 'bg-gray-100 group-hover:bg-gray-200'
      }`}>
        <IconComp size={12} className={isSelected ? 'text-rose-500' : 'text-gray-500'} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${isSelected ? 'text-rose-700' : 'text-gray-700'}`}>
          {manifest.label}
        </p>
        <p className="text-[10px] text-gray-400">#{index + 1}</p>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={e => {
            e.stopPropagation();
            if (pageId) dispatch(builderActions.toggleSectionVisibility(pageId, section.id));
          }}
          title={section.enabled ? 'Hide' : 'Show'}
          className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {section.enabled ? <Eye size={12} /> : <EyeOff size={12} className="text-rose-400" />}
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            setShowDeleteModal(true);
          }}
          title="Delete section"
          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
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
    <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-white border border-rose-300 shadow-lg w-56 opacity-95">
      <GripVertical size={14} className="text-gray-400 flex-shrink-0" />
      <div className="w-6 h-6 rounded bg-rose-100 flex items-center justify-center flex-shrink-0">
        <IconComp size={12} className="text-rose-500" />
      </div>
      <p className="text-xs font-medium text-gray-700 truncate">{manifest.label}</p>
    </div>
  );
};
