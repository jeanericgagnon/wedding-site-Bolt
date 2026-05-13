import { type ReactNode } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { DashboardStateBlock } from '../../components/dashboard/DashboardStateBlock';

interface VaultDashboardRouteViewProps {
  children: ReactNode;
  loading: boolean;
}

export function VaultDashboardRouteView({ children, loading }: VaultDashboardRouteViewProps) {
  return (
    <DashboardLayout currentPage="vault">
      {loading ? (
        <div className="max-w-4xl mx-auto">
          <DashboardStateBlock title="Loading vaults…" description="Preparing your time capsule settings." />
        </div>
      ) : (
        children
      )}
    </DashboardLayout>
  );
}
