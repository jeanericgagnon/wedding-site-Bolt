import { GuestHouseholdPanel, type GuestHouseholdPanelProps } from './GuestHouseholdPanel';
import { GuestListPanel, type GuestListPanelProps } from './GuestListPanel';

interface GuestListDisplaySwitcherProps {
  filteredGuestCount: number;
  householdProps: GuestHouseholdPanelProps;
  listProps: GuestListPanelProps;
  viewMode: 'list' | 'households';
  onClearFilters: () => void;
}

export function GuestListDisplaySwitcher({
  filteredGuestCount,
  householdProps,
  listProps,
  viewMode,
  onClearFilters,
}: GuestListDisplaySwitcherProps) {
  if (filteredGuestCount === 0 && viewMode === 'list') {
    return (
      <div className="rounded-2xl border border-dashed border-border-subtle bg-surface-subtle/30 p-6 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Guest view</p>
        <p className="mt-3 text-sm font-semibold text-text-primary">No guests in this segment right now.</p>
        <p className="mt-2 text-sm leading-6 text-text-secondary">This view is empty because the current filters or search are too narrow, not because the guest list is gone.</p>
        <button
          onClick={onClearFilters}
          className="mt-4 text-xs font-semibold text-primary hover:underline"
        >
          Clear filters to view all guests
        </button>
      </div>
    );
  }

  if (viewMode === 'households') {
    return <GuestHouseholdPanel {...householdProps} />;
  }

  return <GuestListPanel {...listProps} />;
}
