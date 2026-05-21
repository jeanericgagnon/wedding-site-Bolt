import { type ComponentProps } from 'react';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { DashboardStateBlock } from '../../../components/dashboard/DashboardStateBlock';
import { MessageDashboardView } from './MessageDashboardView';

interface MessageDashboardRouteViewProps {
  dashboardProps: ComponentProps<typeof MessageDashboardView>;
  loading: boolean;
}

export function MessageDashboardRouteView({
  dashboardProps,
  loading,
}: MessageDashboardRouteViewProps) {
  if (loading) {
    return (
      <DashboardLayout currentPage="messages">
        <div>
          <DashboardStateBlock title="Loading messages…" description="Preparing your campaigns and activity." />
        </div>
      </DashboardLayout>
    );
  }

  return <MessageDashboardView {...dashboardProps} />;
}
