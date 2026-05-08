import React, { type ComponentProps, type ReactNode } from 'react';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { DashboardStateBlock } from '../../../components/dashboard/DashboardStateBlock';
import { GuestDashboardOpsView } from './GuestDashboardOpsView';
import { GuestRsvpSettingsView } from './GuestRsvpSettingsView';

interface GuestDashboardRouteViewProps {
  children?: ReactNode;
  loading: boolean;
  opsViewProps: ComponentProps<typeof GuestDashboardOpsView>;
  rsvpConfigViewProps: ComponentProps<typeof GuestRsvpSettingsView>;
  showRsvpConfig: boolean;
}

export function GuestDashboardRouteView({
  children,
  loading,
  opsViewProps,
  rsvpConfigViewProps,
  showRsvpConfig,
}: GuestDashboardRouteViewProps) {
  if (loading) {
    return (
      <DashboardLayout currentPage="guests">
        <div className="max-w-[1100px] mx-auto">
          <DashboardStateBlock title="Loading guests…" description="Preparing your guest list and RSVP status." />
        </div>
      </DashboardLayout>
    );
  }

  if (showRsvpConfig) {
    return <GuestRsvpSettingsView {...rsvpConfigViewProps} />;
  }

  return <GuestDashboardOpsView {...opsViewProps}>{children}</GuestDashboardOpsView>;
}
