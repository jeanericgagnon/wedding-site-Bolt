import { type ReactNode } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { DashboardStateBlock } from '../../components/dashboard/DashboardStateBlock';

interface VaultDashboardRouteViewProps {
  children: ReactNode;
  error: string | null;
  loading: boolean;
}

export function VaultDashboardRouteView({ children, error, loading }: VaultDashboardRouteViewProps) {
  return (
    <DashboardLayout currentPage="vault">
      {loading ? (
        <div>
          <DashboardStateBlock title="Loading vaults…" description="Preparing your time capsule settings." />
        </div>
      ) : error ? (
        <div>
          <DashboardStateBlock title="Couldn’t open vaults right now" description={error} tone="error" />
        </div>
      ) : (
        children
      )}
    </DashboardLayout>
  );
}
