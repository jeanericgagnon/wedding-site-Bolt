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
