import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
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
      <div className="space-y-6">
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
              <Link to="/dashboard/itinerary" className="rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm font-medium text-text-primary no-underline hover:bg-surface-subtle">Schedule</Link>
              <Link to="/dashboard/guests" className="rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm font-medium text-text-primary no-underline hover:bg-surface-subtle">Guests</Link>
              <Link to="/dashboard/coordinator" className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white no-underline hover:bg-primary/90">Day-of view</Link>
            </>
          }
        />

        <section className="rounded-[20px] border border-border-subtle bg-surface p-5 shadow-none">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Planning workspace</p>
              <h2 className="mt-3 font-serif text-2xl font-normal text-text-primary">Pick an area and keep moving.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">Tasks, budget, vendors, songs, addresses, and name change stay in one workspace.</p>
            </div>
            <div className="inline-flex flex-wrap gap-2 text-xs text-text-tertiary">
              <span className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-3 py-1">Tasks and vendors</span>
              <span className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-3 py-1">Budget and payments</span>
              <span className="rounded-lg border border-border-subtle bg-surface-subtle/30 px-3 py-1">Supporting details</span>
            </div>
          </div>
        </section>

        <div className="rounded-[20px] border border-border-subtle bg-surface p-4 shadow-none">
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => {
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active
                      ? 'border border-primary/30 bg-primary/10 text-primary'
                      : 'border border-border-subtle bg-surface text-text-secondary hover:border-primary/30 hover:text-primary'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="mt-3">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary">View mode</label>
            <select
              value={planningRole}
              onChange={(e) => onPlanningRoleChange(e.target.value as PlannerAccessRole)}
              disabled={activeSiteRole !== 'owner'}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary md:max-w-xs"
            >
              {PLANNER_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {activeSiteRole !== 'owner' && <p className="mt-1 text-xs text-text-tertiary">Follows your collaborator role.</p>}
          </div>
        </div>

        {planningRole === 'planner' && (
          <div className="rounded-[20px] border border-primary/20 bg-primary/5 p-4 text-sm shadow-none">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Planner view</p>
            <p className="mt-3 font-semibold text-primary">Tasks, vendors, budget, and wedding-day details stay in focus here.</p>
            <p className="mt-2 leading-6 text-primary/80">This view keeps the planning workspace centered on the operational details a planner usually needs most.</p>
          </div>
        )}
        {planningRole === 'coordinator' && (
          <div className="rounded-[20px] border border-border-subtle bg-surface-subtle/30 p-4 text-sm text-text-secondary shadow-none">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Coordinator view</p>
            <p className="mt-3 leading-6">Schedule-related tasks stay editable here, while budget and vendor details stay with the couple or planner.</p>
          </div>
        )}
        {planningRole === 'viewer' && (
          <div className="rounded-[20px] border border-border-subtle bg-surface-subtle/30 p-4 text-sm text-text-secondary shadow-none">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Read-only view</p>
            <p className="mt-3 leading-6">Budget and vendor details stay visible for review, while editing stays with the couple or planner.</p>
          </div>
        )}

        {children}
      </div>
    </DashboardLayout>
  );
}
