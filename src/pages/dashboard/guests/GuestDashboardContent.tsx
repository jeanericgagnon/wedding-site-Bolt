import { type ComponentProps } from 'react';
import { GuestOpsSummaryPanel } from './GuestOpsSummaryPanel';
import { GuestRsvpConflictPanels } from './GuestRsvpConflictPanels';
import { GuestSnapshotInsightsPanel } from './GuestSnapshotInsightsPanel';
import { GuestDashboardWorkspace } from './GuestDashboardWorkspace';

interface GuestDashboardContentProps {
  cleanGuestsView: boolean;
  conflictProps: ComponentProps<typeof GuestRsvpConflictPanels>;
  insightsProps: ComponentProps<typeof GuestSnapshotInsightsPanel>;
  opsSummaryProps: ComponentProps<typeof GuestOpsSummaryPanel>;
  workspaceProps: ComponentProps<typeof GuestDashboardWorkspace>;
}

export function GuestDashboardContent({
  cleanGuestsView,
  conflictProps,
  insightsProps,
  opsSummaryProps,
  workspaceProps,
}: GuestDashboardContentProps) {
  return (
    <>
      {!cleanGuestsView && <GuestSnapshotInsightsPanel {...insightsProps} />}

      {!cleanGuestsView && <GuestRsvpConflictPanels {...conflictProps} />}

      <GuestOpsSummaryPanel {...opsSummaryProps} />

      <GuestDashboardWorkspace {...workspaceProps} />
    </>
  );
}
