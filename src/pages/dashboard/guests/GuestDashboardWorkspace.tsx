import { type ComponentProps } from 'react';
import { Card } from '../../../components/ui';
import { GuestEngagementControlsPanel } from './GuestEngagementControlsPanel';
import { GuestListDisplaySwitcher } from './GuestListDisplaySwitcher';

interface GuestDashboardWorkspaceProps {
  engagementProps: ComponentProps<typeof GuestEngagementControlsPanel>;
  filteredGuestCount: number;
  householdProps: ComponentProps<typeof GuestListDisplaySwitcher>['householdProps'];
  listProps: ComponentProps<typeof GuestListDisplaySwitcher>['listProps'];
  viewMode: ComponentProps<typeof GuestListDisplaySwitcher>['viewMode'];
  onClearFilters: () => void;
}

export function GuestDashboardWorkspace({
  engagementProps,
  filteredGuestCount,
  householdProps,
  listProps,
  viewMode,
  onClearFilters,
}: GuestDashboardWorkspaceProps) {
  return (
    <Card variant="bordered" padding="lg">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Guest workspace</p>
            <h2 className="mt-3 font-serif text-2xl font-normal text-text-primary">Search, sort, and work the list.</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">The deeper guest controls live here: filters, households, view modes, list cleanup, and the detailed records themselves.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-text-tertiary">
            <span className="rounded-xl border border-border-subtle bg-surface-subtle/30 px-3 py-1">{filteredGuestCount} in view</span>
            <span className="rounded-xl border border-border-subtle bg-surface-subtle/30 px-3 py-1">{viewMode === 'households' ? 'Household view' : 'Guest view'}</span>
          </div>
        </div>

        <GuestEngagementControlsPanel {...engagementProps} />
        <GuestListDisplaySwitcher
          filteredGuestCount={filteredGuestCount}
          householdProps={householdProps}
          listProps={listProps}
          viewMode={viewMode}
          onClearFilters={onClearFilters}
        />
      </div>
    </Card>
  );
}
