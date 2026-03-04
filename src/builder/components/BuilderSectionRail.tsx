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
}

export const BuilderSectionRail: React.FC<BuilderSectionRailProps> = ({
  activePageId,
  activeSections,
  selectedSectionId,
  onSelectSection,
  onAddSection,
}) => {
  const [showAddSectionPicker, setShowAddSectionPicker] = React.useState(false);
  const [addSectionType, setAddSectionType] = React.useState<string | null>(null);
  const sectionManifests = React.useMemo(() => getAllSectionManifests(), []);
  const addTypeManifest = addSectionType ? sectionManifests.find((m) => m.type === addSectionType) ?? null : null;

  return (
    <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
      <div className="px-5 py-4 border-b border-[var(--color-border-subtle)]">
        <h3 className="text-[32px] font-semibold text-[var(--color-text-primary)]">Website settings</h3>
      </div>

      <div className="max-h-[62vh] overflow-y-auto px-4 py-3 space-y-2">
        {activeSections.map((section) => {
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
              className={`w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-left transition-colors ${
                isActive ? 'bg-[var(--color-surface-subtle)]' : 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-subtle)]'
              }`}
            >
              <div className="flex items-center gap-3 text-[var(--color-text-primary)]">
                <GripVertical size={15} className="text-[var(--color-text-tertiary)]" />
                <span className="text-[13px] font-medium">{getSectionManifest(section.type as any).label}</span>
                <ChevronRight size={16} className="ml-auto text-[var(--color-text-tertiary)]" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="p-3 border-t border-[var(--color-border-subtle)] sticky bottom-0 bg-[var(--color-surface)]">
        <button
          type="button"
          onClick={() => {
            setShowAddSectionPicker(true);
            setAddSectionType(null);
          }}
          className="w-full rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-[14px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)]"
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