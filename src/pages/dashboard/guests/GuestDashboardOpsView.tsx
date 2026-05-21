import { type ComponentProps, type ReactNode } from 'react';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { GuestDashboardContent } from './GuestDashboardContent';
import { GuestDashboardHeader } from './GuestDashboardHeader';

interface GuestDashboardOpsViewProps {
  children?: ReactNode;
  contentProps: ComponentProps<typeof GuestDashboardContent>;
  headerProps: ComponentProps<typeof GuestDashboardHeader>;
}

export function GuestDashboardOpsView({
  children,
  contentProps,
  headerProps,
}: GuestDashboardOpsViewProps) {
  return (
    <DashboardLayout currentPage="guests">
      <div className="space-y-7">
        <GuestDashboardHeader {...headerProps} />
        <GuestDashboardContent {...contentProps} />
      </div>
      {children}
    </DashboardLayout>
  );
}
