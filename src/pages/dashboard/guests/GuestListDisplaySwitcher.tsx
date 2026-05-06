import React from 'react';
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
      <div className="p-6 border border-dashed border-border rounded-lg text-center bg-surface-subtle">
        <p className="text-sm text-text-secondary">No guests in this segment right now.</p>
        <button
          onClick={onClearFilters}
          className="mt-2 text-xs text-primary hover:underline"
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
