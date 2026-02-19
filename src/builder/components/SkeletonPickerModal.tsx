import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { CUSTOM_SKELETONS, CustomSectionSkeleton } from '../../sections/variants/custom/skeletons';

interface SkeletonPickerModalProps {
  onSelect: (skeleton: CustomSectionSkeleton) => void;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  blank: 'Blank',
  announcement: 'Announcements',
  content: 'Content',
  cta: 'Call to Action',
  details: 'Details',
};

const SkeletonThumbnail: React.FC<{ skeleton: CustomSectionSkeleton; selected: boolean }> = ({ skeleton, selected }) => {
  const bg = skeleton.backgroundColor;
  const isDark = (() => {
    const h = bg.replace('#', '');
    if (h.length < 6) return false;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.4;
  })();

  const line = isDark ? 'bg-white/30' : 'bg-stone-300';
  const lineDark = isDark ? 'bg-white/15' : 'bg-stone-200';

  const thumbnails: Record<string, React.ReactNode> = {
    blank: (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-3" style={{ backgroundColor: bg }}>
        <div className={`w-16 h-2 rounded ${line}`} />
        <div className={`w-24 h-1.5 rounded ${lineDark}`} />
        <div className={`w-20 h-1.5 rounded ${lineDark}`} />
      </div>
    ),
    announcement: (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-3" style={{ backgroundColor: bg }}>
        <div className={`w-14 h-1.5 rounded-full border ${isDark ? 'border-white/30' : 'border-stone-300'}`} />
        <div className={`w-20 h-2.5 rounded ${line}`} />
        <div className={`w-24 h-1 rounded ${lineDark}`} />
        <div className={`w-12 h-1 rounded ${lineDark}`} />
        <div className={`w-10 h-5 rounded-full ${line} mt-1`} />
      </div>
    ),
    'two-column': (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-3" style={{ backgroundColor: bg }}>
        <div className={`w-16 h-2 rounded ${line} mb-1`} />
        <div className="flex gap-2 w-full px-1">
          <div className="flex-1 flex flex-col gap-1">
            <div className={`h-1.5 rounded ${line}`} />
            <div className={`h-1 rounded ${lineDark}`} />
            <div className={`h-1 rounded ${lineDark}`} />
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <div className={`h-1.5 rounded ${line}`} />
            <div className={`h-1 rounded ${lineDark}`} />
            <div className={`h-1 rounded ${lineDark}`} />
          </div>
        </div>
      </div>
    ),
    'image-text': (
      <div className="w-full h-full flex items-center gap-2 p-3" style={{ backgroundColor: bg }}>
        <div className={`w-12 h-12 rounded-lg ${lineDark} flex-shrink-0`} />
        <div className="flex-1 flex flex-col gap-1">
          <div className={`h-1.5 rounded ${line}`} />
          <div className={`h-1 rounded ${lineDark}`} />
          <div className={`h-1 rounded ${lineDark}`} />
          <div className={`w-8 h-4 rounded-full ${line} mt-1`} />
        </div>
      </div>
    ),
    cta: (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-3" style={{ backgroundColor: bg }}>
        <div className={`w-20 h-2.5 rounded ${isDark ? 'bg-white/50' : 'bg-stone-400'}`} />
        <div className={`w-24 h-1 rounded ${isDark ? 'bg-white/25' : 'bg-stone-200'}`} />
        <div className={`w-12 h-5 rounded-full mt-1 ${isDark ? 'border border-white/40' : 'bg-stone-800'}`} />
      </div>
    ),
    'info-cards': (
      <div className="w-full h-full flex flex-col items-center p-3 gap-1.5" style={{ backgroundColor: bg }}>
        <div className={`w-16 h-2 rounded ${line} mb-1`} />
        <div className="flex gap-1.5 w-full">
          {[0,1,2].map(i => (
            <div key={i} className={`flex-1 rounded p-1.5 flex flex-col gap-0.5 ${isDark ? 'bg-white/10' : 'bg-white border border-stone-100'}`}>
              <div className={`h-1.5 rounded ${line}`} />
              <div className={`h-1 rounded ${lineDark}`} />
            </div>
          ))}
        </div>
      </div>
    ),
    'full-width': (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-3" style={{ backgroundColor: bg }}>
        <div className={`w-20 h-2.5 rounded ${line}`} />
        <div className={`w-8 h-px ${isDark ? 'bg-white/20' : 'bg-stone-300'}`} />
        <div className={`w-24 h-1 rounded ${lineDark}`} />
        <div className={`w-22 h-1 rounded ${lineDark}`} />
        <div className={`w-20 h-1 rounded ${lineDark}`} />
      </div>
    ),
    details: (
      <div className="w-full h-full flex flex-col items-center p-3 gap-1.5" style={{ backgroundColor: bg }}>
        <div className={`w-14 h-2 rounded ${line} mb-1`} />
        <div className="grid grid-cols-2 gap-1.5 w-full">
          {[0,1,2,3].map(i => (
            <div key={i} className="flex flex-col gap-0.5 items-center">
              <div className={`h-1.5 w-10 rounded ${line}`} />
              <div className={`h-1 w-12 rounded ${lineDark}`} />
            </div>
          ))}
        </div>
      </div>
    ),
  };

  return (
    <div className={`w-full aspect-[4/3] rounded-lg overflow-hidden transition-all ${
      selected ? 'ring-2 ring-rose-500 ring-offset-1' : ''
    }`}>
      {thumbnails[skeleton.thumbnail] ?? (
        <div className="w-full h-full" style={{ backgroundColor: bg }} />
      )}
    </div>
  );
};

const CATEGORIES = ['blank', 'announcement', 'content', 'cta', 'details'] as const;

export const SkeletonPickerModal: React.FC<SkeletonPickerModalProps> = ({ onSelect, onClose }) => {
  const [selected, setSelected] = useState<string>(CUSTOM_SKELETONS[0].id);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filtered = activeCategory === 'all'
    ? CUSTOM_SKELETONS
    : CUSTOM_SKELETONS.filter(s => s.category === activeCategory);

  const selectedSkeleton = CUSTOM_SKELETONS.find(s => s.id === selected) ?? CUSTOM_SKELETONS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden" style={{ maxHeight: '85vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Choose a Section Layout</h2>
            <p className="text-xs text-gray-400 mt-0.5">Pick a skeleton to start from — you can customize everything</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-1.5 px-6 pt-4 pb-2 flex-wrap">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeCategory === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            {filtered.map(skeleton => (
              <button
                key={skeleton.id}
                onClick={() => setSelected(skeleton.id)}
                className={`group text-left rounded-xl overflow-hidden border-2 transition-all ${
                  selected === skeleton.id
                    ? 'border-rose-500 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <SkeletonThumbnail skeleton={skeleton} selected={selected === skeleton.id} />
                <div className="px-3 py-2 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">{skeleton.label}</span>
                    {selected === skeleton.id && (
                      <div className="w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center flex-shrink-0">
                        <Check size={9} className="text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{skeleton.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Selected: <span className="font-medium text-gray-600">{selectedSkeleton.label}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onSelect(selectedSkeleton)}
              className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Add Section
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
