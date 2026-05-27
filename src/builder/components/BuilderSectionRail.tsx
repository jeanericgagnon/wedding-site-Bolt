import React from 'react';
import { ChevronRight, GripVertical, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
import { getAllSectionManifests, getSectionManifest } from '../registry/sectionManifests';
import { getVariantPreviewSource } from '../registry/variantPreviewSource';
import { getBuilderSectionRecoverySummary } from './builderSectionRecoverySummary';
import { summarizeBuilderSectionRail } from './builderSectionRailSummary';
import { BuilderSectionType } from '../../types/builder/section';

interface RailSection {
  id: string;
  type: BuilderSectionType;
  enabled?: boolean;
  locked?: boolean;
  settings?: Record<string, unknown>;
  bindings?: Record<string, unknown>;
  styleOverrides?: Record<string, unknown>;
  meta?: {
    createdAtISO: string;
    updatedAtISO: string;
  };
}

const ESSENTIAL_SECTION_TYPES = ['hero', 'venue', 'schedule', 'travel', 'rsvp', 'faq', 'registry'] as const;

interface BuilderSectionRailProps {
  activePageId?: string;
  activeSections: RailSection[];
  selectedSectionId: string | null;
  onSelectSection: (sectionId: string) => void;
  onAddSection: (type: string, variantId?: string) => void;
  onReorderSections: (orderedIds: string[]) => void;
  onSwitchTemplate?: () => void;
}

export const BuilderSectionRail: React.FC<BuilderSectionRailProps> = ({
  activePageId,
  activeSections,
  selectedSectionId,
  onSelectSection,
  onAddSection,
  onReorderSections,
  onSwitchTemplate,
}) => {
  const [showAddSectionPicker, setShowAddSectionPicker] = React.useState(false);
  const [addSectionType, setAddSectionType] = React.useState<string | null>(null);
  const sectionManifests = React.useMemo(() => getAllSectionManifests(), []);
  const addTypeManifest = addSectionType ? sectionManifests.find((m) => m.type === addSectionType) ?? null : null;
  const essentialManifests = sectionManifests.filter((m) => ESSENTIAL_SECTION_TYPES.includes(m.type as typeof ESSENTIAL_SECTION_TYPES[number]));
  const railSummary = summarizeBuilderSectionRail(activeSections);
  const recoverySummary = getBuilderSectionRecoverySummary(activeSections);
  const quickAddManifests = essentialManifests.filter((manifest) => railSummary.missingEssentials.includes(manifest.label)).slice(0, 4);

  const runRecoveryAction = (action: typeof recoverySummary.primaryAction) => {
    if (action.kind === 'add-essential' && action.sectionType) {
      const manifest = getSectionManifest(action.sectionType);
      onAddSection(manifest.type, manifest.defaultVariant);
      return;
    }
    if (action.sectionId) {
      onSelectSection(action.sectionId);
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-section-id="${action.sectionId}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const moveSection = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= activeSections.length || fromIndex === toIndex) return;
    const next = [...activeSections];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onReorderSections(next.map((s) => s.id));
  };

  return (
    <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)] h-full flex flex-col">
      <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
        <h3 className="text-[20px] font-semibold text-[var(--color-text-primary)]">Website sections</h3>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-tertiary)]">Visible</p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">{railSummary.visible}</p>
          </div>
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-tertiary)]">Hidden</p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">{railSummary.hidden}</p>
          </div>
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-tertiary)]">Locked</p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">{railSummary.locked}</p>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-sky-100 bg-sky-50 px-3 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-800">Section recovery</p>
              <p className="mt-1 text-sm font-semibold text-sky-950">{recoverySummary.focusTitle}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-sky-900">{recoverySummary.focusDetail}</p>
            </div>
            <div className="rounded-full border border-sky-200 bg-white px-2 py-1 text-[10px] font-semibold text-sky-800">
              {recoverySummary.ready} ready
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-white/80 bg-white/80 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700">Best next move</p>
            <p className="mt-1 text-[11px] font-semibold text-sky-950">{recoverySummary.bestNextMove}</p>
            <p className="mt-1 text-[10px] leading-relaxed text-sky-800">
              <span className="font-semibold text-sky-950">Decision rule:</span> {recoverySummary.decisionRule}
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-sky-800">
              <span className="font-semibold text-sky-950">Watchout:</span> {recoverySummary.watchout}
            </p>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {[
              { label: 'Current', detail: recoverySummary.currentStep },
              { label: 'Next', detail: recoverySummary.nextStep },
              { label: 'Then', detail: recoverySummary.thenStep },
            ].map((step) => (
              <div key={step.label} className="rounded-lg border border-white/80 bg-white/80 px-2 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-sky-700">{step.label}</p>
                <p className="mt-1 text-[10px] leading-relaxed text-sky-900">{step.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runRecoveryAction(recoverySummary.primaryAction)}
              className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-sky-800 hover:bg-sky-100"
            >
              {recoverySummary.primaryAction.label}
            </button>
            <button
              type="button"
              onClick={() => runRecoveryAction(recoverySummary.secondaryAction)}
              className="rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-[11px] font-medium text-sky-800 hover:bg-sky-100"
            >
              {recoverySummary.secondaryAction.label}
            </button>
          </div>
        </div>
        {quickAddManifests.length > 0 && (
          <div className="mt-3 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-800">Still missing</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {quickAddManifests.map((manifest) => (
                <button
                  key={manifest.type}
                  type="button"
                  onClick={() => onAddSection(manifest.type, manifest.defaultVariant)}
                  className="rounded-full border border-sky-200 bg-white px-3 py-1.5 text-[11px] font-medium text-sky-900 hover:bg-sky-100"
                >
                  Add {manifest.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1.5">
        {activeSections.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3 py-4 text-sm text-[var(--color-text-secondary)] space-y-2">
            <p className="font-medium text-[var(--color-text-primary)]">This page is empty.</p>
            <p>Add a section to get something real on the page before you start styling.</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {essentialManifests.slice(0, 4).map((m) => (
                <button
                  key={m.type}
                  type="button"
                  onClick={() => onAddSection(m.type, m.defaultVariant)}
                  className="rounded-full border border-[var(--color-border-subtle)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]"
                >
                  Add {m.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {activeSections.map((section, idx) => {
          const isActive = selectedSectionId === section.id;
          const sectionManifest = getSectionManifest(section.type as Parameters<typeof getSectionManifest>[0]);
          const isHidden = section.enabled === false;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => {
                onSelectSection(section.id);
                requestAnimationFrame(() => {
                  const el = document.querySelector(`[data-section-id="${section.id}"]`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
              }}
              className={`w-full rounded-lg border px-3 py-2.5 transition-colors text-left ${
                isActive
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-subtle)]'
              }`}
            >
              <div className="flex items-center gap-2.5 text-[var(--color-text-primary)]">
                <span className="inline-flex items-center justify-center text-[var(--color-text-tertiary)]" title="Reorder section">
                  <GripVertical size={14} />
                </span>
                <div className="min-w-0">
                  <span className="block truncate text-[13px] font-medium">{sectionManifest.label}</span>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[var(--color-text-tertiary)]">
                    <span>#{idx + 1}</span>
                    {isHidden && (
                      <span className="rounded-full bg-[var(--color-surface-subtle)] px-1.5 py-0.5 font-medium text-[var(--color-text-secondary)]">
                        Hidden
                      </span>
                    )}
                    {section.locked && (
                      <span className="rounded-full bg-[var(--color-surface-subtle)] px-1.5 py-0.5 font-medium text-[var(--color-text-secondary)]">
                        Locked
                      </span>
                    )}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); moveSection(idx, idx - 1); }}
                    disabled={idx === 0}
                    className="inline-flex items-center justify-center rounded-md p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-primary)]"
                    title="Move up"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); moveSection(idx, idx + 1); }}
                    disabled={idx === activeSections.length - 1}
                    className="inline-flex items-center justify-center rounded-md p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-primary)]"
                    title="Move down"
                  >
                    <ArrowDown size={13} />
                  </button>
                  <ChevronRight size={15} className="text-[var(--color-text-tertiary)]" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="p-2.5 border-t border-[var(--color-border-subtle)] sticky bottom-0 bg-[var(--color-surface)] space-y-2">
        {onSwitchTemplate && (
          <button
            type="button"
            onClick={onSwitchTemplate}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-[13px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]"
          >
            Browse designs
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setShowAddSectionPicker(true);
            setAddSectionType(null);
          }}
          className="w-full rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-[13px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]"
        >
          + Add section
        </button>
      </div>

      {showAddSectionPicker && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
          <div className="w-[94vw] h-[90vh] max-w-6xl bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border-subtle)] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                  {!addTypeManifest ? 'Add section' : `${addTypeManifest.label} layouts`}
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  {!addTypeManifest
                    ? 'Pick the kind of section you want, then choose the layout that fits best.'
                    : `Choose the ${addTypeManifest.label.toLowerCase()} layout you want to add.`}
                </p>
                {!addTypeManifest && (
                  <p className="mt-2 text-[11px] text-[var(--color-text-tertiary)]">
                    Start with the essentials guests need most: welcome, venue, schedule, RSVP, and travel.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {addTypeManifest && (
                  <button
                    type="button"
                    onClick={() => setAddSectionType(null)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSectionPicker(false);
                    setAddSectionType(null);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              {!addTypeManifest ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
                    <div className="flex items-center gap-2 text-sky-900">
                      <Sparkles size={14} />
                      <p className="text-sm font-semibold">Start with the essentials</p>
                    </div>
                    <p className="mt-1 text-xs text-sky-800">For most pages, start with the sections guests need first: welcome, venue, schedule, travel, RSVP, and FAQ.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {essentialManifests.map((m) => (
                        <button
                          key={m.type}
                          type="button"
                          onClick={() => setAddSectionType(m.type)}
                          className="rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-sky-900 hover:bg-sky-100"
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {sectionManifests.map((m) => (
                    <button
                      key={m.type}
                      onClick={() => setAddSectionType(m.type)}
                      className="w-full text-left rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-3 py-3 hover:border-[var(--color-border)]"
                    >
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{m.label}</p>
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{m.variantMeta.length} layout options</p>
                      <p className="text-[11px] text-[var(--color-text-tertiary)] mt-2 line-clamp-2">{m.variantMeta[0]?.description || 'Start with this section and choose a layout next.'}</p>
                      <p className="text-[11px] text-[var(--color-primary)] mt-2 font-medium">Choose section</p>
                    </button>
                  ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {addTypeManifest.variantMeta.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        if (!activePageId) return;
                        onAddSection(addTypeManifest.type, v.id);
                        setShowAddSectionPicker(false);
                        setAddSectionType(null);
                      }}
                      className="w-full text-left rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-3 py-3 hover:border-[var(--color-border)]"
                    >
                      <div className="mb-2 h-28 overflow-hidden rounded-md border border-[var(--color-border-subtle)] bg-white">
                        <img
                          src={`/variant-previews/${addTypeManifest.type}__${getVariantPreviewSource(addTypeManifest.type, v.id)}.webp`}
                          alt={`${addTypeManifest.label} ${v.label} preview`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            const t = e.currentTarget;
                            t.onerror = null;
                            t.src = '/template-previews/_fallback.svg';
                          }}
                        />
                      </div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{v.label}</p>
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-1 line-clamp-2">{v.description || 'Clean layout option'}</p>
                      <p className="text-[11px] text-[var(--color-primary)] mt-2 font-medium">Add this layout</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
