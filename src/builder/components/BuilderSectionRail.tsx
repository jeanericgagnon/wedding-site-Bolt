import React from 'react';
import { ChevronRight, GripVertical, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
import { getAllSectionManifests, getSectionManifest } from '../registry/sectionManifests';
import { getVariantPreviewSource } from '../registry/variantPreviewSource';
import type { WeddingDataV1 } from '../../types/weddingData';
import type { BuilderSectionType } from '../../types/builder/section';
import { getVariantRecommendation, sortVariantsByRecommendation } from '../utils/variantRecommendations';
import { getVariantQualityScore } from '../utils/variantQuality';

interface RailSection {
  id: string;
  type: string;
}

interface BuilderSectionRailProps {
  activePageId?: string;
  activeSections: RailSection[];
  selectedSectionId: string | null;
  onSelectSection: (sectionId: string) => void;
  onAddSection: (type: string, variantId?: string) => void;
  onReorderSections: (orderedIds: string[]) => void;
  onSwitchTemplate?: () => void;
  weddingData?: WeddingDataV1 | null;
  themeId?: string;
}

export const BuilderSectionRail: React.FC<BuilderSectionRailProps> = ({
  activePageId,
  activeSections,
  selectedSectionId,
  onSelectSection,
  onAddSection,
  onReorderSections,
  onSwitchTemplate,
  weddingData,
  themeId,
}) => {
  const [showAddSectionPicker, setShowAddSectionPicker] = React.useState(false);
  const [addSectionType, setAddSectionType] = React.useState<string | null>(null);
  const sectionManifests = React.useMemo(() => getAllSectionManifests(), []);
  const addTypeManifest = addSectionType ? sectionManifests.find((m) => m.type === addSectionType) ?? null : null;
  const recommendationContext = React.useMemo(() => ({ weddingData, themeId, activeSections }), [activeSections, themeId, weddingData]);
  const addTypeVariants = React.useMemo(() => {
    if (!addTypeManifest) return [];
    return sortVariantsByRecommendation(addTypeManifest.type, addTypeManifest.variantMeta, recommendationContext);
  }, [addTypeManifest, recommendationContext]);
  const essentialSectionTypes = ['hero', 'venue', 'schedule', 'travel', 'rsvp', 'faq', 'registry'];
  const essentialManifests = sectionManifests.filter((m) => essentialSectionTypes.includes(m.type));
  const recommendedPickerManifests = essentialManifests.slice(0, 3);
  const morePickerManifests = sectionManifests.filter((m) => !recommendedPickerManifests.some((recommended) => recommended.type === m.type));

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
        <h3 className="text-[20px] font-semibold text-[var(--color-text-primary)]">Site sections</h3>
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
          const selectSection = () => {
            onSelectSection(section.id);
            requestAnimationFrame(() => {
              const el = document.querySelector(`[data-section-id="${section.id}"]`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
          };
          return (
            <div
              key={section.id}
              className={`w-full rounded-xl border transition-colors text-left ${
                isActive
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-subtle)]'
              }`}
            >
              <div className="flex items-center gap-2.5 text-[var(--color-text-primary)]">
                <button
                  type="button"
                  onClick={selectSection}
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left"
                  aria-current={isActive ? 'true' : undefined}
                >
                  <span className="inline-flex items-center justify-center text-[var(--color-text-tertiary)]" title="Reorder section">
                    <GripVertical size={14} />
                  </span>
                  <span className="truncate text-[13px] font-medium">{getSectionManifest(section.type as any).label}</span>
                </button>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveSection(idx, idx - 1)}
                    disabled={idx === 0}
                    className="inline-flex items-center justify-center rounded-xl p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-[var(--color-text-tertiary)]"
                    title="Move up"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(idx, idx + 1)}
                    disabled={idx === activeSections.length - 1}
                    className="inline-flex items-center justify-center rounded-xl p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-[var(--color-text-tertiary)]"
                    title="Move down"
                  >
                    <ArrowDown size={13} />
                  </button>
                  <ChevronRight size={15} className="text-[var(--color-text-tertiary)]" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-2.5 border-t border-[var(--color-border-subtle)] sticky bottom-0 bg-[var(--color-surface)] space-y-2">
        {onSwitchTemplate && (
          <button
            type="button"
            onClick={onSwitchTemplate}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-[13px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]"
          >
            Change design
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setShowAddSectionPicker(true);
            setAddSectionType(null);
          }}
          className="w-full rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-[13px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]"
        >
          + Add section
        </button>
      </div>

      {showAddSectionPicker && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
          <div className="flex h-[90vh] w-[94vw] max-w-6xl flex-col overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-sm">
            <div className="px-5 py-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                  {!addTypeManifest ? 'Add section' : `${addTypeManifest.label} layouts`}
                </h3>
                <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  {!addTypeManifest ? 'Start with the few sections guests usually need first, then open more choices if you want them.' : `Choose the ${addTypeManifest.label.toLowerCase()} layout you want to add.`}
                  {!addTypeManifest && <p className="mt-2 text-[11px] text-[var(--color-text-tertiary)]">Most couples only need a welcome, place, schedule, RSVP, and travel details before the site feels useful.</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {addTypeManifest && (
                  <button
                    type="button"
                    onClick={() => setAddSectionType(null)}
                    className="rounded-xl border border-[var(--color-border-subtle)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
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
                  className="rounded-xl border border-[var(--color-border-subtle)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              {!addTypeManifest ? (
                <div className="space-y-4">
                  <div aria-label="Recommended sections" className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-4 py-3">
                    <div className="flex items-center gap-2 text-[var(--color-text-primary)]">
                      <Sparkles size={14} />
                      <p className="text-sm font-semibold">Recommended first</p>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">A simple first pass keeps the page easy to finish. You can add more once the basics feel right.</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {recommendedPickerManifests.map((m) => (
                        <button
                          key={m.type}
                          type="button"
                          onClick={() => setAddSectionType(m.type)}
                          className="rounded-xl border border-[var(--color-border-subtle)] bg-white px-3 py-3 text-left text-xs font-medium text-[var(--color-text-primary)] hover:border-[var(--color-primary)]/25 hover:bg-[var(--color-surface)]"
                        >
                          <span className="block text-sm font-semibold">{m.label}</span>
                          <span className="mt-1 block text-[11px] font-normal text-[var(--color-text-secondary)]">{m.variantMeta.length} layout options</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 px-1 text-xs font-semibold text-[var(--color-text-tertiary)]">More sections</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {morePickerManifests.map((m) => (
                      <button
                        key={m.type}
                        onClick={() => setAddSectionType(m.type)}
                        className="w-full text-left rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-3 py-3 hover:border-[var(--color-border)]"
                      >
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{m.label}</p>
                        <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{m.variantMeta.length} layout options</p>
                        <p className="text-[11px] text-[var(--color-text-tertiary)] mt-2 line-clamp-2">{m.variantMeta.find((variant) => variant.recommended)?.bestFor || m.variantMeta[0]?.description || 'Start with this section and choose a layout next.'}</p>
                        <p className="text-[11px] text-[var(--color-primary)] mt-2 font-medium">Choose section</p>
                      </button>
                    ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {addTypeVariants.map((v) => {
                    const recommendation = getVariantRecommendation(addTypeManifest.type as BuilderSectionType, v, recommendationContext);
                    const quality = getVariantQualityScore(addTypeManifest.type, v, addTypeManifest.variantMeta.length);
                    const mobileRisk = quality.flags.includes('mobile-risk');
                    return (
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
                        <div className="mb-2 h-28 overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-white">
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
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-[var(--color-text-primary)]">{v.label}</p>
                          {recommendation.label && (
                            <span className="shrink-0 rounded-full border border-[var(--color-border-subtle)] bg-white px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)]">{recommendation.label}</span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--color-text-tertiary)] mt-1 line-clamp-2">{v.description || 'Clean layout option'}</p>
                        {recommendation.reasons[0] ? (
                          <p className="mt-2 rounded-xl bg-white px-2 py-1.5 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">{recommendation.reasons[0]}</p>
                        ) : v.bestFor ? (
                          <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-text-secondary)] line-clamp-2">Best for {v.bestFor}</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {v.recommended && (
                            <span className="rounded-full border border-[var(--color-border-subtle)] bg-white px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)]">Recommended</span>
                          )}
                          {v.effort && (
                            <span className="rounded-full border border-[var(--color-border-subtle)] bg-white px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-tertiary)]">{v.effort} setup</span>
                          )}
                          {mobileRisk && (
                            <span className="rounded-full border border-[var(--color-border-subtle)] bg-white px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">Check mobile</span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--color-primary)] mt-2 font-medium">Add this layout</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
