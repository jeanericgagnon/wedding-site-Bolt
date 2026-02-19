import React, { useState } from 'react';
import {
  Image, Heart, MapPin, Clock, Plane, Gift, HelpCircle, Mail, Images,
  Layout, Palette, FolderOpen, ChevronRight, ArrowLeft, Plus, LucideIcon,
} from 'lucide-react';
import { useBuilderContext } from '../state/builderStore';
import { builderActions } from '../state/builderActions';
import { getAllSectionManifests, BuilderSectionDefinitionWithMeta, VariantMeta } from '../registry/sectionManifests';
import { BuilderSectionType } from '../../types/builder/section';

type SidebarTab = 'sections' | 'templates' | 'media';

const SECTION_ICONS: Record<string, LucideIcon> = {
  Image, Heart, MapPin, Clock, Plane, Gift, HelpCircle, Mail, Images,
};

interface BuilderSidebarLibraryProps {
  activePageId: string | null;
}

export const BuilderSidebarLibrary: React.FC<BuilderSidebarLibraryProps> = ({ activePageId }) => {
  const { dispatch } = useBuilderContext();
  const [activeTab, setActiveTab] = useState<SidebarTab>('sections');
  const [expandedType, setExpandedType] = useState<BuilderSectionType | null>(null);
  const manifests = getAllSectionManifests();

  const expandedManifest = expandedType
    ? manifests.find(m => m.type === expandedType) ?? null
    : null;

  function handleSectionClick(manifest: BuilderSectionDefinitionWithMeta) {
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
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden">
      <div className="flex border-b border-gray-200">
        {([
          { id: 'sections', icon: Layout, label: 'Sections' },
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
        {activeTab === 'sections' && !expandedManifest && (
          <div className="p-3 space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
              Add Sections
            </p>
            {manifests.map(manifest => {
              const IconComp = SECTION_ICONS[manifest.icon] ?? Layout;
              return (
                <button
                  key={manifest.type}
                  onClick={() => handleSectionClick(manifest)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-gray-50 group transition-colors"
                >
                  <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0 group-hover:bg-rose-50 transition-colors">
                    <IconComp size={15} className="text-gray-500 group-hover:text-rose-500 transition-colors" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-700 truncate">{manifest.label}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {manifest.variantMeta.length} {manifest.variantMeta.length === 1 ? 'style' : 'styles'}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 flex-shrink-0 group-hover:text-gray-500 transition-colors" />
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
  isDefault: boolean;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

const VariantCard: React.FC<VariantCardProps> = ({ variant, isDefault, isHovered, onHover, onSelect }) => {
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
      <VariantPreviewSwatch variantId={variant.id} isHovered={isHovered} />

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

const VariantPreviewSwatch: React.FC<{ variantId: string; isHovered: boolean }> = ({ variantId, isHovered }) => {
  const h = isHovered;

  const swatches: Record<string, React.ReactNode> = {
    default: (
      <div className={`w-full h-14 flex items-center gap-2 px-3 transition-colors ${h ? 'bg-rose-100' : 'bg-gray-100'}`}>
        <div className={`flex-1 h-2.5 rounded ${h ? 'bg-rose-300' : 'bg-gray-300'}`} />
        <div className={`w-10 h-2.5 rounded ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
      </div>
    ),
    minimal: (
      <div className={`w-full h-14 flex flex-col items-center justify-center gap-1.5 transition-colors ${h ? 'bg-rose-50' : 'bg-white border-b border-gray-100'}`}>
        <div className={`w-20 h-2 rounded ${h ? 'bg-rose-400' : 'bg-gray-400'}`} />
        <div className={`w-14 h-1.5 rounded ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
      </div>
    ),
    fullbleed: (
      <div className={`w-full h-14 relative flex items-center justify-center transition-colors ${h ? 'bg-rose-900' : 'bg-gray-700'}`}>
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative flex flex-col items-center gap-1.5">
          <div className="w-24 h-2 bg-white/90 rounded" />
          <div className="w-16 h-1.5 bg-white/60 rounded" />
        </div>
      </div>
    ),
    centered: (
      <div className={`w-full h-14 flex flex-col items-center justify-center gap-1 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`w-7 h-7 rounded-full mb-0.5 ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
        <div className={`w-16 h-1.5 rounded ${h ? 'bg-rose-300' : 'bg-gray-300'}`} />
      </div>
    ),
    split: (
      <div className={`w-full h-14 flex transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`w-1/2 h-full ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
        <div className="w-1/2 flex flex-col justify-center gap-1.5 px-2.5">
          <div className={`h-1.5 rounded ${h ? 'bg-rose-300' : 'bg-gray-300'}`} />
          <div className={`h-1.5 rounded w-3/4 ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
        </div>
      </div>
    ),
    card: (
      <div className={`w-full h-14 flex items-center gap-1.5 px-2.5 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        {[0, 1].map(i => (
          <div key={i} className={`flex-1 h-9 rounded-md flex flex-col justify-center gap-1 px-2 ${h ? 'bg-rose-100 border border-rose-200' : 'bg-white border border-gray-200'}`}>
            <div className={`h-1.5 rounded ${h ? 'bg-rose-300' : 'bg-gray-300'}`} />
            <div className={`h-1 rounded w-2/3 ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
          </div>
        ))}
      </div>
    ),
    timeline: (
      <div className={`w-full h-14 flex items-center px-3 gap-2.5 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className="flex flex-col items-center gap-0.5">
          <div className={`w-3 h-3 rounded-full ${h ? 'bg-rose-400' : 'bg-gray-400'}`} />
          <div className={`w-0.5 h-4 ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
        </div>
        <div className="flex-1 space-y-1.5">
          <div className={`h-1.5 rounded ${h ? 'bg-rose-300' : 'bg-gray-300'}`} />
          <div className={`h-1.5 rounded w-2/3 ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
        </div>
      </div>
    ),
    cards: (
      <div className={`w-full h-14 flex items-center gap-1 px-2 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        {[0, 1, 2].map(i => (
          <div key={i} className={`flex-1 h-10 rounded flex flex-col justify-between pb-1.5 pt-1 px-1.5 ${h ? 'bg-rose-100 border border-rose-200' : 'bg-white border border-gray-200'}`}>
            <div className={`w-full h-4 rounded-sm ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
            <div className={`h-1 rounded ${h ? 'bg-rose-300' : 'bg-gray-300'}`} />
          </div>
        ))}
      </div>
    ),
    grid: (
      <div className={`w-full h-14 flex items-center justify-center transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className="grid grid-cols-3 gap-1 w-28">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`h-3 rounded-sm ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>
    ),
    accordion: (
      <div className={`w-full h-14 flex flex-col justify-center gap-1.5 px-3 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        {[0, 1].map(i => (
          <div key={i} className={`flex items-center justify-between px-2 py-1 rounded border ${h ? 'border-rose-200 bg-rose-100' : 'border-gray-200 bg-white'}`}>
            <div className={`h-1 w-16 rounded ${h ? 'bg-rose-300' : 'bg-gray-300'}`} />
            <div className={`w-2.5 h-2.5 rounded-sm ${h ? 'bg-rose-300' : 'bg-gray-300'}`} />
          </div>
        ))}
      </div>
    ),
    inline: (
      <div className={`w-full h-14 flex items-center px-3 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className={`flex-1 h-8 rounded-lg border flex items-center px-2.5 gap-2 ${h ? 'border-rose-300 bg-white' : 'border-gray-200 bg-white'}`}>
          <div className={`flex-1 h-1.5 rounded ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
          <div className={`w-14 h-5 rounded text-[9px] flex items-center justify-center font-semibold tracking-wide ${h ? 'bg-rose-500 text-white' : 'bg-gray-700 text-white'}`}>
            RSVP
          </div>
        </div>
      </div>
    ),
    masonry: (
      <div className={`w-full h-14 flex items-start gap-1 px-2 pt-2 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-50'}`}>
        <div className="flex-1 flex flex-col gap-1">
          <div className={`h-6 rounded-sm ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
          <div className={`h-3 rounded-sm ${h ? 'bg-rose-300' : 'bg-gray-300'}`} />
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <div className={`h-3 rounded-sm ${h ? 'bg-rose-300' : 'bg-gray-300'}`} />
          <div className={`h-6 rounded-sm ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <div className={`h-4 rounded-sm ${h ? 'bg-rose-200' : 'bg-gray-200'}`} />
          <div className={`h-5 rounded-sm ${h ? 'bg-rose-300' : 'bg-gray-300'}`} />
        </div>
      </div>
    ),
  };

  const swatch = swatches[variantId];
  if (swatch) return <>{swatch}</>;
  return <div className={`w-full h-14 transition-colors ${h ? 'bg-rose-50' : 'bg-gray-100'}`} />;
};
