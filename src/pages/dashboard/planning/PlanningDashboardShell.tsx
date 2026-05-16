import { type ReactNode } from 'react';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { DashboardPageHero } from '../../../components/dashboard/DashboardPageHero';
import type { PlannerAccessRole } from '../../../lib/plannerAccess';

type Tab = 'overview' | 'tasks' | 'budget' | 'payments' | 'vendors' | 'songs' | 'addresses' | 'nameChange';

interface PlanningDashboardShellProps {
  activeSiteRole: PlannerAccessRole;
  activeTab: Tab;
  children: ReactNode;
  estimatedTotal: number;
  onPlanningRoleChange: (role: PlannerAccessRole) => void;
  onTabChange: (tab: Tab) => void;
  openTaskCount: number;
  paidTotal: number;
  planningRole: PlannerAccessRole;
  rsvpQuestionCount?: never;
  tasksCount: number;
  vendorsCount: number;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'budget', label: 'Budget' },
  { id: 'payments', label: 'Payments' },
  { id: 'vendors', label: 'Vendors' },
  { id: 'songs', label: 'Song requests' },
  { id: 'addresses', label: 'Address collection' },
  { id: 'nameChange', label: 'Name change' },
];

const PLANNER_ROLE_OPTIONS: { value: PlannerAccessRole; label: string }[] = [
  { value: 'owner', label: 'Owner view' },
  { value: 'planner', label: 'Planner view' },
  { value: 'coordinator', label: 'Coordinator view' },
  { value: 'viewer', label: 'Read-only view' },
];

export function PlanningDashboardShell({
  activeSiteRole,
  activeTab,
  children,
  estimatedTotal,
  onPlanningRoleChange,
  onTabChange,
  openTaskCount,
  paidTotal,
  planningRole,
  tasksCount,
  vendorsCount,
}: PlanningDashboardShellProps) {
  return (
    <DashboardLayout currentPage="planning">
      <div className="max-w-5xl mx-auto space-y-6">
        <DashboardPageHero
          eyebrow="Planner"
          title="Plans, notes, and finishing touches."
          description="Keep the supporting details close without turning your wedding into a task board."
          stats={[
            { label: 'Open tasks', value: openTaskCount, detail: `${tasksCount} total` },
            { label: 'Vendors', value: vendorsCount, detail: vendorsCount === 1 ? 'contact saved' : 'contacts saved' },
            { label: 'Paid so far', value: `$${paidTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, detail: estimatedTotal > 0 ? `of $${estimatedTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })} estimated` : 'budget fills in as you go' },
          ]}
          actions={
            <>
              <a href="/dashboard/itinerary" className="rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm font-medium text-text-primary no-underline hover:bg-surface-subtle">Schedule</a>
              <a href="/dashboard/guests" className="rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm font-medium text-text-primary no-underline hover:bg-surface-subtle">Guests</a>
              <a href="/dashboard/coordinator" className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white no-underline hover:bg-primary/90">Day-of view</a>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-3 rounded-lg border border-border-subtle bg-white/80 p-3 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-text-primary">Section</label>
            <select
              value={activeTab}
              onChange={(e) => onTabChange(e.target.value as Tab)}
              className="mt-1 w-full px-3 py-2.5 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {TABS.map((tab) => (
                <option key={tab.id} value={tab.id}>{tab.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-text-primary">How this page is shown</label>
            <select
              value={planningRole}
              onChange={(e) => onPlanningRoleChange(e.target.value as PlannerAccessRole)}
              disabled={activeSiteRole !== 'owner'}
              className="mt-1 w-full px-3 py-2.5 text-sm bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {PLANNER_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {activeSiteRole !== 'owner' && (
              <p className="mt-1 text-xs text-text-tertiary">This follows your current collaborator role.</p>
            )}
          </div>
        </div>

        {planningRole === 'planner' && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
            Planner view is on. This keeps the page centered on tasks, vendors, budget, and wedding-day details.
          </div>
        )}
        {planningRole === 'coordinator' && (
          <div className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2 text-xs text-text-secondary">
            Day-of helper view is on. Schedule-related tasks stay editable here, while budget and vendor details stay with the couple or planner.
          </div>
        )}
        {planningRole === 'viewer' && (
          <div className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2 text-xs text-text-secondary">
            Read-only view is on. Budget and vendor details stay visible for review, while editing stays with the couple or planner.
          </div>
        )}

        {children}
      </div>
    </DashboardLayout>
  );
}
