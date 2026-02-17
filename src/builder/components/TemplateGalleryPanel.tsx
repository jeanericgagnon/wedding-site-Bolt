import React, { useState } from 'react';
import { X, Check, Sparkles, Loader2 } from 'lucide-react';
import { useBuilderContext } from '../state/builderStore';
import { builderActions } from '../state/builderActions';
import { getAllTemplatePacks } from '../constants/builderTemplatePacks';
import { BuilderTemplateDefinition, TemplateMoodTag } from '../../types/builder/template';
import { createBuilderSectionFromLibrary } from '../adapters/layoutAdapter';

const MOOD_FILTERS: { id: TemplateMoodTag | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'modern', label: 'Modern' },
  { id: 'romantic', label: 'Romantic' },
  { id: 'classic', label: 'Classic' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'destination', label: 'Destination' },
  { id: 'floral', label: 'Floral' },
];

export const TemplateGalleryPanel: React.FC = () => {
  const { state, dispatch } = useBuilderContext();
  const [activeFilter, setActiveFilter] = useState<TemplateMoodTag | 'all'>('all');
  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(null);
  const [confirmTemplate, setConfirmTemplate] = useState<BuilderTemplateDefinition | null>(null);

  const templates = getAllTemplatePacks();
  const filtered =
    activeFilter === 'all'
      ? templates
      : templates.filter(t => t.moodTags.includes(activeFilter));

  const activePageId = state.activePageId;
  const currentTemplateId = state.project?.templateId;

  const handleApplyTemplate = async (template: BuilderTemplateDefinition) => {
    if (!activePageId) return;
    setApplyingTemplateId(template.id);

    try {
      const sections = template.sectionComposition.map((slot, idx) =>
        createBuilderSectionFromLibrary(slot.type, slot.variant, idx)
      );

      dispatch(builderActions.applyTemplate(template.id, sections));
      dispatch(builderActions.applyTheme(template.defaultThemeId));
      dispatch(builderActions.closeTemplateGallery());
      setConfirmTemplate(null);
    } finally {
      setApplyingTemplateId(null);
    }
  };

  if (!state.templateGalleryOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50" onClick={() => dispatch(builderActions.closeTemplateGallery())} />
      <div className="relative ml-auto w-full max-w-4xl bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Template Gallery</h2>
            <p className="text-sm text-gray-500">Choose a starting point for your wedding site</p>
          </div>
          <button
            onClick={() => dispatch(builderActions.closeTemplateGallery())}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2 px-6 py-3 border-b border-gray-100 overflow-x-auto">
          {MOOD_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeFilter === f.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-6">
            {filtered.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                isCurrent={template.id === currentTemplateId}
                isApplying={applyingTemplateId === template.id}
                onPreview={() => setConfirmTemplate(template)}
                onApply={() => setConfirmTemplate(template)}
              />
            ))}
          </div>
        </div>
      </div>

      {confirmTemplate && (
        <TemplateConfirmModal
          template={confirmTemplate}
          isApplying={applyingTemplateId === confirmTemplate.id}
          onConfirm={() => handleApplyTemplate(confirmTemplate)}
          onCancel={() => setConfirmTemplate(null)}
        />
      )}
    </div>
  );
};

interface TemplateCardProps {
  template: BuilderTemplateDefinition;
  isCurrent: boolean;
  isApplying: boolean;
  onPreview: () => void;
  onApply: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, isCurrent, isApplying, onApply }) => (
  <div className={`group rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
    isCurrent ? 'border-rose-400' : 'border-transparent hover:border-gray-200'
  }`} onClick={onApply}>
    <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
      <div className="absolute inset-0 flex items-end p-4">
        <div className="text-xs font-medium text-white bg-black/30 backdrop-blur-sm px-2 py-1 rounded">
          Preview
        </div>
      </div>
      {isCurrent && (
        <div className="absolute top-3 right-3 bg-rose-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
          <Check size={12} />
        </div>
      )}
      {template.isPremium && (
        <div className="absolute top-3 left-3 bg-amber-400 text-amber-900 rounded-full px-2 py-0.5 text-xs font-semibold flex items-center gap-1">
          <Sparkles size={10} />
          Premium
        </div>
      )}
      {template.isNew && (
        <div className="absolute top-3 left-3 bg-blue-500 text-white rounded-full px-2 py-0.5 text-xs font-semibold">
          New
        </div>
      )}
    </div>
    <div className="p-4">
      <h3 className="font-semibold text-gray-900 text-sm">{template.displayName}</h3>
      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{template.description}</p>
      <div className="flex gap-1 mt-2 flex-wrap">
        {template.moodTags.slice(0, 3).map(tag => (
          <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">
            {tag}
          </span>
        ))}
      </div>
      <button
        onClick={e => { e.stopPropagation(); onApply(); }}
        disabled={isApplying}
        className={`mt-3 w-full py-2 rounded-lg text-xs font-medium transition-colors ${
          isCurrent
            ? 'bg-rose-50 text-rose-600 border border-rose-200'
            : 'bg-gray-900 text-white hover:bg-gray-800'
        }`}
      >
        {isApplying ? (
          <span className="flex items-center justify-center gap-1.5">
            <Loader2 size={12} className="animate-spin" />
            Applying...
          </span>
        ) : isCurrent ? 'Current Template' : 'Apply Template'}
      </button>
    </div>
  </div>
);

interface TemplateConfirmModalProps {
  template: BuilderTemplateDefinition;
  isApplying: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const TemplateConfirmModal: React.FC<TemplateConfirmModalProps> = ({ template, isApplying, onConfirm, onCancel }) => (
  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30">
    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
      <h3 className="text-base font-semibold text-gray-900">Apply "{template.displayName}"?</h3>
      <p className="text-sm text-gray-500 mt-2">
        This will replace your current section layout. Your content and media will be preserved.
      </p>
      <div className="flex gap-3 mt-5">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isApplying}
          className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors"
        >
          {isApplying ? 'Applying...' : 'Apply Template'}
        </button>
      </div>
    </div>
  </div>
);
