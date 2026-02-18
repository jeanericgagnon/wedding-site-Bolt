import React, { useState, useCallback } from 'react';
import { X, Check, Sparkles, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { useBuilderContext } from '../state/builderStore';
import { builderActions } from '../state/builderActions';
import { getAllTemplatePacks } from '../constants/builderTemplatePacks';
import { BuilderTemplateDefinition, TemplateMoodTag } from '../../types/builder/template';
import { createBuilderSectionFromLibrary } from '../adapters/layoutAdapter';
import { BuilderSectionInstance } from '../../types/builder/section';
import { selectActivePage } from '../state/builderSelectors';

function preserveContentAcrossTemplate(
  existingSections: BuilderSectionInstance[],
  newSections: BuilderSectionInstance[]
): BuilderSectionInstance[] {
  const existingByType = new Map<string, BuilderSectionInstance>();
  for (const sec of existingSections) {
    if (!existingByType.has(sec.type)) {
      existingByType.set(sec.type, sec);
    }
  }
  return newSections.map(newSec => {
    const existing = existingByType.get(newSec.type);
    if (!existing) return newSec;
    return {
      ...newSec,
      settings: { ...newSec.settings, ...existing.settings },
      bindings: { ...newSec.bindings, ...existing.bindings },
      styleOverrides: { ...existing.styleOverrides },
    };
  });
}

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

interface TemplateGalleryPanelProps {
  onSaveRequest?: () => void;
}

interface ApplyResult {
  templateName: string;
  newSections: string[];
  preservedSections: string[];
}

export const TemplateGalleryPanel: React.FC<TemplateGalleryPanelProps> = ({ onSaveRequest }) => {
  const { state, dispatch } = useBuilderContext();
  const [activeFilter, setActiveFilter] = useState<TemplateMoodTag | 'all'>('all');
  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(null);
  const [confirmTemplate, setConfirmTemplate] = useState<BuilderTemplateDefinition | null>(null);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);

  const templates = getAllTemplatePacks();
  const filtered =
    activeFilter === 'all'
      ? templates
      : templates.filter(t => t.moodTags.includes(activeFilter));

  const currentTemplateId = state.project?.templateId;
  const activePage = selectActivePage(state);

  const handleApplyTemplate = useCallback(async (template: BuilderTemplateDefinition) => {
    if (!activePage) return;
    setApplyingTemplateId(template.id);

    try {
      const existingTypes = new Set(activePage.sections.map(s => s.type));
      const baseSections = template.sectionComposition.map((slot, idx) =>
        createBuilderSectionFromLibrary(slot.type, slot.variant, idx)
      );

      const mergedSections = preserveContentAcrossTemplate(activePage.sections, baseSections);

      const newSectionTypes = template.sectionComposition
        .filter(slot => !existingTypes.has(slot.type))
        .map(slot => slot.type.charAt(0).toUpperCase() + slot.type.slice(1));
      const preservedTypes = template.sectionComposition
        .filter(slot => existingTypes.has(slot.type))
        .map(slot => slot.type.charAt(0).toUpperCase() + slot.type.slice(1));

      dispatch(builderActions.applyTemplate(template.id, mergedSections));
      dispatch(builderActions.applyTheme(template.defaultThemeId));
      setConfirmTemplate(null);
      setApplyResult({
        templateName: template.displayName,
        newSections: newSectionTypes,
        preservedSections: preservedTypes,
      });

      if (onSaveRequest) {
        setTimeout(onSaveRequest, 100);
      }
    } finally {
      setApplyingTemplateId(null);
    }
  }, [activePage, dispatch, onSaveRequest]);

  if (!state.templateGalleryOpen && !applyResult) return null;

  if (applyResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40" onClick={() => setApplyResult(null)} />
        <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-green-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">"{applyResult.templateName}" applied</h3>
          <p className="text-sm text-gray-500 mb-5">Your site layout has been updated.</p>

          {applyResult.preservedSections.length > 0 && (
            <div className="mb-3 text-left bg-green-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-green-700 mb-2">Content preserved from before:</p>
              <ul className="space-y-1">
                {applyResult.preservedSections.map(s => (
                  <li key={s} className="text-xs text-green-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {applyResult.newSections.length > 0 && (
            <div className="mb-5 text-left bg-blue-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-700 mb-2">New sections added:</p>
              <ul className="space-y-1">
                {applyResult.newSections.map(s => (
                  <li key={s} className="text-xs text-blue-600 flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-gray-400 mb-5">
            You can undo this change with <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">⌘Z</kbd>
          </p>

          <button
            onClick={() => setApplyResult(null)}
            className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Got it — continue editing
          </button>
        </div>
      </div>
    );
  }

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
      <div className="mt-3 space-y-2.5">
        <div className="flex items-start gap-2.5 p-3 bg-green-50 rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-green-700">
            <span className="font-semibold">Preserved:</span> All your text content, images, and media stay exactly as they are.
          </div>
        </div>
        <div className="flex items-start gap-2.5 p-3 bg-amber-50 rounded-xl">
          <RefreshCw className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-700">
            <span className="font-semibold">Updated:</span> Section layout and visual theme will switch to match "{template.displayName}".
          </div>
        </div>
        <p className="text-xs text-gray-400 pl-1">You can undo this immediately with ⌘Z.</p>
      </div>
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
          {isApplying ? 'Applying…' : 'Apply Template'}
        </button>
      </div>
    </div>
  </div>
);
