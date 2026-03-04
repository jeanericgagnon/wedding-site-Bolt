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
}

export const BuilderSectionRail: React.FC<BuilderSectionRailProps> = ({
  activePageId,
  activeSections,
  selectedSectionId,
  onSelectSection,
  onAddSection,
  onReorderSections,
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

      <div className="p-2.5 border-t border-[var(--color-border-subtle)] sticky bottom-0 bg-[var(--color-surface)]">
        <button
          type="button"
          onClick={() => {
            setShowAddSectionPicker(true);
            setAddSectionType(null);
          }}
          className="w-full rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-[13px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]"
        >
          + Add section
        </button>
      </div>

      {showAddSectionPicker && (
        <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-2.5 space-y-2">
          {!addTypeManifest ? (
            <>
              <p className="text-[11px] font-semibold text-[var(--color-text-primary)]">Choose a section</p>
              <div className="max-h-56 overflow-y-auto grid grid-cols-1 gap-2">
                {sectionManifests.map((m) => (
                  <button
                    key={m.type}
                    onClick={() => setAddSectionType(m.type)}
                    className="w-full text-left rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-2.5 py-2 hover:border-[var(--color-border)]"
                  >
                    <p className="text-xs font-medium text-[var(--color-text-primary)]">{m.label}</p>
                    <p className="text-[11px] text-[var(--color-text-tertiary)]">{m.variantMeta.length} variants</p>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-[var(--color-text-primary)]">{addTypeManifest.label} variants</p>
                <button onClick={() => setAddSectionType(null)} className="text-[11px] text-[var(--color-text-secondary)]">Back</button>
              </div>
              <div className="max-h-64 overflow-y-auto grid grid-cols-1 gap-2">
                {addTypeManifest.variantMeta.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      if (!activePageId) return;
                      onAddSection(addTypeManifest.type, v.id);
                      setShowAddSectionPicker(false);
                      setAddSectionType(null);
                    }}
                    className="w-full text-left rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-2.5 py-2 hover:border-[var(--color-border)]"
                  >
                    <p className="text-xs font-medium text-[var(--color-text-primary)]">{v.label}</p>
                    <p className="text-[11px] text-[var(--color-text-tertiary)] line-clamp-2">{v.description || 'Clean layout option'}</p>
                  </button>
                ))}
              </div>
            </>
          )}
          <button
            onClick={() => {
              setShowAddSectionPicker(false);
              setAddSectionType(null);
            }}
            className="w-full rounded-lg border border-[var(--color-border-subtle)] px-2 py-1.5 text-[11px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};