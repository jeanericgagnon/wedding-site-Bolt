import React, { useState } from 'react';
import {
  Image, Heart, MapPin, Clock, Plane, Gift, HelpCircle, Mail, Images,
  Layout, Palette, FolderOpen, ChevronRight, LucideIcon,
} from 'lucide-react';
import { useBuilderContext } from '../state/builderStore';
import { builderActions } from '../state/builderActions';
import { getAllSectionManifests } from '../registry/sectionManifests';
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
  const manifests = getAllSectionManifests();

  const handleAddSection = (type: BuilderSectionType) => {
    if (!activePageId) return;
    dispatch(builderActions.addSectionByType(activePageId, type));
  };

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
              else setActiveTab(tab.id);
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

      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'sections' && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
              Add Sections
            </p>
            {manifests.map(manifest => {
              const IconComp = SECTION_ICONS[manifest.icon] ?? Layout;
              return (
                <button
                  key={manifest.type}
                  onClick={() => handleAddSection(manifest.type)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-gray-50 group transition-colors"
                >
                  <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0 group-hover:bg-rose-50 transition-colors">
                    <IconComp size={15} className="text-gray-500 group-hover:text-rose-500 transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{manifest.label}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {manifest.supportedVariants.length} variants
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 ml-auto flex-shrink-0 group-hover:text-gray-500 transition-colors" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
