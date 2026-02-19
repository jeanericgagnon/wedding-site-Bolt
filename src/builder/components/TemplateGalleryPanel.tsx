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
  { id: 'bold', label: 'Bold' },
  { id: 'photo', label: 'Photo-first' },
];

interface TemplateGalleryPanelProps {
  onSaveRequest?: () => void;
}

interface ApplyResult {
  templateName: string;
  newSections: string[];
  preservedSections: string[];
}

const TEMPLATE_PREVIEWS: Record<string, React.FC> = {
  'modern-luxe': () => (
    <div className="absolute inset-0 bg-zinc-900 flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-700 to-zinc-900 opacity-60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <div className="w-16 h-0.5 bg-white/40 mb-3" />
          <div className="text-white text-xs font-light tracking-[0.3em] uppercase mb-1">Sarah & James</div>
          <div className="text-white text-lg font-serif leading-tight mb-1">Together Forever</div>
          <div className="text-white/60 text-xs tracking-widest">JUNE 14, 2026</div>
          <div className="w-16 h-0.5 bg-white/40 mt-3" />
        </div>
      </div>
      <div className="h-16 bg-zinc-800 flex gap-px">
        {['Hero', 'Story', 'Gallery', 'RSVP'].map(s => (
          <div key={s} className="flex-1 bg-zinc-700/60 flex items-center justify-center">
            <span className="text-white/40 text-[7px] uppercase tracking-wider">{s}</span>
          </div>
        ))}
      </div>
    </div>
  ),

  'editorial-romance': () => (
    <div className="absolute inset-0 bg-stone-50 flex flex-col">
      <div className="flex-1 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-100/60 via-stone-100 to-amber-50/40" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
          <div className="text-xs text-rose-400 tracking-[0.4em] uppercase mb-2">A Celebration of Love</div>
          <div className="text-stone-800 text-xl font-serif text-center leading-snug mb-2">
            Emma<br /><span className="text-rose-300 text-base">&amp;</span><br />Oliver
          </div>
          <div className="text-stone-400 text-[9px] tracking-widest uppercase">September · 2026</div>
        </div>
      </div>
      <div className="h-12 border-t border-stone-200 grid grid-cols-4 divide-x divide-stone-200">
        {['Story', 'Gallery', 'Venue', 'RSVP'].map(s => (
          <div key={s} className="flex items-center justify-center">
            <span className="text-stone-300 text-[7px] uppercase tracking-wider">{s}</span>
          </div>
        ))}
      </div>
    </div>
  ),

  'timeless-classic': () => (
    <div className="absolute inset-0 bg-[#faf8f4] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="w-12 h-px bg-[#c9a96e] mb-4" />
        <div className="text-[#c9a96e] text-[9px] tracking-[0.4em] uppercase mb-3">You are cordially invited to</div>
        <div className="text-[#2c2416] text-base font-serif leading-tight">
          The Wedding of<br />
          <span className="text-lg">Charlotte &amp; William</span>
        </div>
        <div className="w-12 h-px bg-[#c9a96e] my-4" />
        <div className="text-[#8a7a60] text-[8px] tracking-widest uppercase">Saturday · 21st June · 2026</div>
        <div className="text-[#8a7a60] text-[8px] tracking-wider mt-1">Grand Manor House, Cotswolds</div>
      </div>
      <div className="h-10 bg-[#f0ebe0] border-t border-[#e0d8c8] flex items-center justify-center gap-6">
        {['Our Story', 'Venue', 'RSVP'].map(s => (
          <span key={s} className="text-[#8a7a60] text-[7px] tracking-wider uppercase">{s}</span>
        ))}
      </div>
    </div>
  ),

  'destination-minimal': () => (
    <div className="absolute inset-0 bg-white flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-sky-100 to-white" />
        <div className="absolute inset-0 flex flex-col items-start justify-center px-5">
          <div className="text-sky-400 text-[8px] tracking-[0.3em] uppercase mb-2">Destination Wedding</div>
          <div className="text-gray-900 text-lg font-light tracking-tight leading-tight mb-1">Mia &amp; Luca</div>
          <div className="text-gray-400 text-[9px] tracking-widest mb-4">SANTORINI · JULY 2026</div>
          <div className="flex gap-1">
            <div className="h-1.5 w-8 bg-sky-300 rounded-full" />
            <div className="h-1.5 w-4 bg-gray-200 rounded-full" />
            <div className="h-1.5 w-6 bg-gray-200 rounded-full" />
          </div>
        </div>
      </div>
      <div className="h-14 border-t border-gray-100">
        <div className="h-full flex">
          <div className="w-1/3 border-r border-gray-100 flex flex-col items-center justify-center gap-1">
            <div className="w-8 h-8 rounded bg-sky-50 flex items-center justify-center">
              <div className="w-4 h-4 rounded-sm bg-sky-200" />
            </div>
            <span className="text-[6px] text-gray-300 uppercase tracking-wider">Venue</span>
          </div>
          <div className="w-1/3 border-r border-gray-100 flex flex-col items-center justify-center gap-1">
            <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center">
              <div className="w-4 h-3 rounded-sm bg-gray-200" />
            </div>
            <span className="text-[6px] text-gray-300 uppercase tracking-wider">Travel</span>
          </div>
          <div className="w-1/3 flex flex-col items-center justify-center gap-1">
            <div className="w-8 h-8 rounded bg-sky-50 flex items-center justify-center">
              <div className="w-4 h-2 rounded-full bg-sky-300" />
            </div>
            <span className="text-[6px] text-gray-300 uppercase tracking-wider">RSVP</span>
          </div>
        </div>
      </div>
    </div>
  ),

  'bold-contemporary': () => (
    <div className="absolute inset-0 bg-neutral-950 flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950" />
        <div className="absolute top-0 right-0 w-2/3 h-full bg-neutral-800/40" style={{ clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0% 100%)' }} />
        <div className="absolute inset-0 flex flex-col justify-end px-4 pb-5">
          <div className="text-white/30 text-[8px] tracking-[0.4em] uppercase mb-1">2026</div>
          <div className="text-white text-2xl font-black tracking-tight leading-none uppercase">JADE<br />&amp; MAX</div>
          <div className="flex items-center gap-2 mt-3">
            <div className="h-px flex-1 bg-white/20" />
            <div className="text-white/40 text-[7px] uppercase tracking-widest">New York City</div>
          </div>
        </div>
      </div>
      <div className="h-12 flex divide-x divide-neutral-800">
        {['Schedule', 'Gallery', 'Venue', 'RSVP'].map(s => (
          <div key={s} className="flex-1 flex items-center justify-center bg-neutral-900">
            <span className="text-neutral-500 text-[7px] font-bold uppercase tracking-wider">{s}</span>
          </div>
        ))}
      </div>
    </div>
  ),

  'photo-storytelling': () => (
    <div className="absolute inset-0 bg-stone-100 flex flex-col">
      <div className="flex-1 relative overflow-hidden grid grid-cols-3 grid-rows-2 gap-0.5 p-0.5">
        <div className="col-span-2 row-span-2 bg-gradient-to-br from-stone-300 to-stone-400 relative rounded-sm overflow-hidden">
          <div className="absolute inset-0 flex flex-col items-start justify-end p-3">
            <div className="bg-white/90 rounded px-2 py-1">
              <div className="text-stone-800 text-[9px] font-serif">Ava &amp; Noah</div>
              <div className="text-stone-400 text-[7px]">October 2026</div>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-200 to-amber-300 rounded-sm" />
        <div className="bg-gradient-to-br from-rose-200 to-rose-300 rounded-sm" />
      </div>
      <div className="h-10 bg-white border-t border-stone-200 flex items-center px-3 gap-3">
        <div className="flex-1 h-1.5 bg-stone-100 rounded" />
        <div className="h-1.5 w-8 bg-stone-100 rounded" />
        <div className="w-12 h-5 rounded-full bg-stone-800 flex items-center justify-center">
          <span className="text-white text-[6px] uppercase tracking-wider">RSVP</span>
        </div>
      </div>
    </div>
  ),

  'floral-garden': () => (
    <div className="absolute inset-0 bg-[#f4f7f0] flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-16 h-16 rounded-full bg-emerald-100/80 -translate-x-4 -translate-y-4" />
        <div className="absolute top-0 right-0 w-12 h-12 rounded-full bg-rose-100/80 translate-x-3 -translate-y-3" />
        <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-emerald-100/60 -translate-x-5 translate-y-5" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <div className="text-emerald-500 text-[8px] tracking-[0.3em] uppercase mb-2">Garden Wedding</div>
          <div className="text-stone-700 text-lg font-serif leading-tight">
            Rose &amp; Henry
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="text-emerald-300 text-base">✿</div>
            <div className="text-stone-400 text-[8px] tracking-widest uppercase">May 2026</div>
            <div className="text-emerald-300 text-base">✿</div>
          </div>
        </div>
      </div>
      <div className="h-12 border-t border-emerald-100 grid grid-cols-4 divide-x divide-emerald-100">
        {['Story', 'Gallery', 'Venue', 'RSVP'].map(s => (
          <div key={s} className="flex items-center justify-center">
            <span className="text-emerald-300 text-[7px] uppercase tracking-wider">{s}</span>
          </div>
        ))}
      </div>
    </div>
  ),
};

function TemplatePreview({ templateId }: { templateId: string }) {
  const Preview = TEMPLATE_PREVIEWS[templateId];
  if (Preview) return <Preview />;
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
      <span className="text-gray-400 text-xs">Preview</span>
    </div>
  );
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
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">
              No templates match this filter.
            </div>
          )}
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
  <div
    className={`group rounded-xl overflow-hidden border-2 transition-all cursor-pointer shadow-sm hover:shadow-md ${
      isCurrent ? 'border-rose-400 ring-1 ring-rose-300' : 'border-transparent hover:border-gray-200'
    }`}
    onClick={onApply}
  >
    <div className="aspect-[4/3] relative overflow-hidden bg-gray-100">
      <TemplatePreview templateId={template.id} />

      {isCurrent && (
        <div className="absolute top-3 right-3 bg-rose-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm">
          <Check size={12} />
        </div>
      )}
      {template.isPremium && !template.isNew && (
        <div className="absolute top-3 left-3 bg-amber-400 text-amber-900 rounded-full px-2 py-0.5 text-xs font-semibold flex items-center gap-1 shadow-sm">
          <Sparkles size={10} />
          Premium
        </div>
      )}
      {template.isNew && (
        <div className="absolute top-3 left-3 bg-blue-500 text-white rounded-full px-2 py-0.5 text-xs font-semibold shadow-sm">
          New
        </div>
      )}

      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
    </div>

    <div className="p-4 bg-white">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight">{template.displayName}</h3>
        <div className="text-[10px] text-gray-400 shrink-0 mt-0.5">
          {template.suggestedFonts.heading}
        </div>
      </div>
      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{template.description}</p>
      <div className="flex gap-1 mt-2.5 flex-wrap">
        {template.moodTags.slice(0, 3).map(tag => (
          <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">
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
            : 'bg-gray-900 text-white hover:bg-gray-800 group-hover:bg-gray-800'
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
