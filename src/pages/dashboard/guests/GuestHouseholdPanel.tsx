import React from 'react';
import { Home, Merge, Users } from 'lucide-react';
import { Button } from '../../../components/ui';
import type { GuestHouseholdGroups } from './guestDashboardUtils';

export interface GuestHouseholdPanelProps {
  householdBusy: boolean;
  households: GuestHouseholdGroups;
  isDemoMode: boolean;
  selectedGuestIds: Set<string>;
  getStatusBadge: (status: string) => React.ReactNode;
  onMergeIntoHousehold: () => void;
  onSetSelectedGuestIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export function GuestHouseholdPanel({
  householdBusy,
  households,
  isDemoMode,
  selectedGuestIds,
  getStatusBadge,
  onMergeIntoHousehold,
  onSetSelectedGuestIds,
}: GuestHouseholdPanelProps) {
  return (
    <div className="space-y-6">
      {selectedGuestIds.size >= 2 && (
        <div className="flex items-center justify-between px-4 py-3 bg-primary/8 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium text-primary">{selectedGuestIds.size} guests selected</span>
          <Button
            variant="primary"
            size="sm"
            onClick={onMergeIntoHousehold}
            disabled={householdBusy || isDemoMode}
          >
            <Merge className="w-3.5 h-3.5 mr-1.5" />
            Merge into Household
          </Button>
        </div>
      )}

      {households.grouped.length === 0 && households.ungrouped.length === 0 && (
        <div className="text-center py-12">
          <Home className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
          <p className="text-text-secondary font-medium mb-1">No households yet</p>
          <p className="text-sm text-text-tertiary">Select guests from the list view to group them into a household.</p>
        </div>
      )}

      {households.grouped.map(([householdId, members]) => (
        <div key={householdId} className="overflow-hidden rounded-lg border border-border-subtle bg-white transition-colors hover:border-primary/25">
          <div className="divide-y divide-border-subtle/60 bg-white">
            {members.map((guest) => {
              const name = guest.first_name && guest.last_name ? `${guest.first_name} ${guest.last_name}` : guest.name;
              return (
                <div key={guest.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{name}</p>
                    <p className="text-xs text-text-tertiary break-words">{guest.email || 'No email'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(guest.rsvp_status)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {households.ungrouped.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-surface-subtle border-b border-border">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-text-tertiary" />
              <span className="font-semibold text-text-primary text-sm">Ungrouped guests</span>
              <span className="text-xs text-text-tertiary break-words">({households.ungrouped.length})</span>
            </div>
            <p className="text-xs text-text-tertiary break-words">Select guests to group them into households</p>
          </div>
          <div className="divide-y divide-border-subtle">
            {households.ungrouped.map((guest) => {
              const name = guest.first_name && guest.last_name ? `${guest.first_name} ${guest.last_name}` : guest.name;
              const isSelected = selectedGuestIds.has(guest.id);
              return (
                <div
                  key={guest.id}
                  className={`flex items-center gap-3 px-5 py-3 transition-colors cursor-pointer ${isSelected ? 'bg-primary/5' : 'hover:bg-surface-subtle'}`}
                  onClick={() => onSetSelectedGuestIds((previous) => {
                    const next = new Set(previous);
                    if (isSelected) {
                      next.delete(guest.id);
                    } else {
                      next.add(guest.id);
                    }
                    return next;
                  })}
                >
                  <div className={`w-4 h-4 rounded border-2 flex-shrink-0 transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-border'}`}>
                    {isSelected && (
                      <svg viewBox="0 0 10 10" className="w-full h-full p-0.5 text-white" fill="none">
                        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{name}</p>
                    <p className="text-xs text-text-tertiary break-words">{guest.email || 'No email'}</p>
                  </div>
                  {getStatusBadge(guest.rsvp_status)}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
