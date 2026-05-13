import { type ReactNode } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';

interface ItineraryDashboardRouteViewProps {
  children: ReactNode;
  loading: boolean;
}

export function ItineraryDashboardRouteView({
  children,
  loading,
}: ItineraryDashboardRouteViewProps) {
  return (
    <DashboardLayout currentPage="itinerary">
      {loading ? (
        <div className="space-y-4 animate-pulse" aria-hidden="true">
          <div className="h-12 w-64 rounded-lg border border-border-subtle bg-surface-subtle" />
          <div className="h-24 rounded-lg border border-border-subtle bg-surface-subtle" />
          <div className="h-24 rounded-lg border border-border-subtle bg-surface-subtle" />
          <div className="h-24 rounded-lg border border-border-subtle bg-surface-subtle" />
        </div>
      ) : (
        children
      )}
    </DashboardLayout>
  );
}
