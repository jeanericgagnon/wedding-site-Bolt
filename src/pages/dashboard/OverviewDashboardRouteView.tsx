import { type ReactNode } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { DashboardStateBlock } from '../../components/dashboard/DashboardStateBlock';

interface OverviewDashboardRouteViewProps {
  children: ReactNode;
  error: string | null;
  loading: boolean;
}

export function OverviewDashboardRouteView({
  children,
  error,
  loading,
}: OverviewDashboardRouteViewProps) {
  return (
    <DashboardLayout currentPage="overview">
      <div className="mx-auto max-w-[1100px] space-y-5">
        {error && <DashboardStateBlock title="Couldn’t load overview right now" description={error} tone="error" />}
        {loading ? (
          <div className="space-y-6 animate-pulse" aria-hidden="true">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="h-32 rounded-2xl border border-border-subtle bg-surface-subtle" />
              <div className="h-32 rounded-2xl border border-border-subtle bg-surface-subtle" />
              <div className="h-32 rounded-2xl border border-border-subtle bg-surface-subtle" />
              <div className="h-32 rounded-2xl border border-border-subtle bg-surface-subtle" />
            </div>
            <div className="h-44 rounded-2xl border border-border-subtle bg-surface-subtle" />
          </div>
        ) : (
          children
        )}
      </div>
    </DashboardLayout>
  );
}
