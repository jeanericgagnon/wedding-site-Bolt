import React from 'react';
import { ChevronRight, GripVertical } from 'lucide-react';
import { getAllSectionManifests, getSectionManifest } from '../registry/sectionManifests';

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
        <h3 className="text-[20px] font-semibold text-[var(--color-text-primary)]">Website settings</h3>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1.5">
        {activeSections.map((section, idx) => {
          const isActive = selectedSectionId === section.id;
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
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveSection(idx, idx + 1 >= activeSections.length ? 0 : idx + 1);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      moveSection(idx, idx + 1 >= activeSections.length ? 0 : idx + 1);
                    }
                  }}
                  className="inline-flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                  title="Move section"
                >
                  <GripVertical size={14} />
                </span>
                <span className="text-[13px] font-medium">{getSectionManifest(section.type as any).label}</span>
                <ChevronRight size={15} className="ml-auto text-[var(--color-text-tertiary)]" />
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
            Browse templates
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
                  {!addTypeManifest ? 'Add section' : `${addTypeManifest.label} variants`}
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  {!addTypeManifest ? 'Pick a section type, then choose a layout variant.' : 'Choose the layout you want to add.'}
                </p>
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
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {sectionManifests.map((m) => (
                    <button
                      key={m.type}
                      onClick={() => setAddSectionType(m.type)}
                      className="w-full text-left rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-3 py-3 hover:border-[var(--color-border)]"
                    >
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{m.label}</p>
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{m.variantMeta.length} variants</p>
                    </button>
                  ))}
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
                          src={`/variant-previews/${addTypeManifest.type}__${v.id}.webp`}
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