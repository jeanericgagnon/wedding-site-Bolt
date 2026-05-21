import { type ComponentProps } from 'react';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { DashboardStateBlock } from '../../../components/dashboard/DashboardStateBlock';
import { GuestDashboardOpsView } from './GuestDashboardOpsView';
import { GuestDashboardOverlays } from './GuestDashboardOverlays';
import { GuestRsvpSettingsView } from './GuestRsvpSettingsView';

interface GuestDashboardRouteViewProps {
  loading: boolean;
  overlayProps: ComponentProps<typeof GuestDashboardOverlays>;
  opsViewProps: ComponentProps<typeof GuestDashboardOpsView>;
  rsvpConfigViewProps: ComponentProps<typeof GuestRsvpSettingsView>;
  showRsvpConfig: boolean;
}

export function GuestDashboardRouteView({
  loading,
  overlayProps,
  opsViewProps,
  rsvpConfigViewProps,
  showRsvpConfig,
}: GuestDashboardRouteViewProps) {
  if (loading) {
    return (
      <DashboardLayout currentPage="guests">
        <div>
          <DashboardStateBlock title="Loading guests…" description="Preparing your guest list and RSVP status." />
        </div>
      </DashboardLayout>
    );
  }

  if (showRsvpConfig) {
    return <GuestRsvpSettingsView {...rsvpConfigViewProps} />;
  }

  return (
    <GuestDashboardOpsView {...opsViewProps}>
      <GuestDashboardOverlays {...overlayProps} />
    </GuestDashboardOpsView>
  );
}
