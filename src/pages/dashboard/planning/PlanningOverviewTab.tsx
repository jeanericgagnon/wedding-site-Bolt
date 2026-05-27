import React from 'react';
import { AlertTriangle, Clock, DollarSign, Users, CheckCircle, HeartHandshake } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import type { NameChangePlan } from '../../../lib/nameChange/types';
import {
  buildNameChangeReminderSuggestions,
  deriveNameChangeReminderAttention,
  mapReminderSuggestionsToInputs,
  summarizeNameChangeReminderAttention,
} from '../../../lib/nameChange/reminders';
import { PlanningTask, PlanningBudgetItem, PlanningVendor } from './planningService';
import { formatVendorDate, isVendorDateBetween } from './vendorDate';
import { isTaskDueBetween, isTaskDueOnOrBefore } from './taskDueDate';
import { buildNameChangeOverviewCardModel } from '../nameChangeOverviewCard';
import { buildNameChangeOverviewInsights } from '../nameChangeOverviewInsights';
import { deriveNameChangeLifecycleStatus } from '../nameChangeLifecycleStatus';
import { PlanningDecisionCard } from './PlanningDecisionCard';
import { buildPlanningOverviewDecisionCard } from './planningDecisionAssistant';
import { buildCoupleFocusModel, type CoupleFocusStep } from '../coupleFocus';
import { getFlowStatusLabel } from '../../../lib/flowLabels';

interface SeatingReadiness {
  attending: number;
  seated: number;
  unassigned: number;
}

interface Props {
  tasks: PlanningTask[];
  budgetItems: PlanningBudgetItem[];
  vendors: PlanningVendor[];
  seatingReadiness: SeatingReadiness;
  itineraryEventCount: number;
  privacyMode: 'public' | 'password_protected' | 'invite_only';
  weddingDate: string | null;
  nameChangePlan: NameChangePlan;
  onTabChange: (tab: string) => void;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function routeToNameChangeLane(primaryHref: string, onTabChange: (tab: string) => void) {
  const [, hash = ''] = primaryHref.split('#');
  if (typeof window !== 'undefined') {
    const nextHash = `#${hash || 'name-change-roadmap'}`;
    const { pathname, search } = window.location;
    window.history.replaceState(null, '', `${pathname}${search}${nextHash}`);
  }
  onTabChange('nameChange');
}

export const PlanningOverviewTab: React.FC<Props> = ({ tasks, budgetItems, vendors, seatingReadiness, itineraryEventCount, privacyMode, weddingDate, nameChangePlan, onTabChange }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);

  const overdueTasks = tasks.filter(t => {
    if (t.status === 'done' || !t.due_date) return false;
    return isTaskDueOnOrBefore(t.due_date, today);
  });

  const upcomingTasks = tasks.filter(t => {
    if (t.status === 'done' || !t.due_date) return false;
    return isTaskDueBetween(t.due_date, today, in7Days);
  });

  const totalEstimated = budgetItems.reduce((s, i) => s + (i.estimated_amount || 0), 0);
  const totalActual = budgetItems.reduce((s, i) => s + (i.actual_amount || 0), 0);

  const unpaidVendorBalance = vendors.reduce((s, v) => s + (v.balance_due || 0), 0);

  const dueSoonVendors = vendors.filter(v => {
    if (!v.next_payment_due || v.balance_due <= 0) return false;
    return isVendorDateBetween(v.next_payment_due, today, in7Days);
  });

  const weddingDateValue = weddingDate ? new Date(`${weddingDate}T00:00:00`) : null;
  const isPostWedding = weddingDateValue ? weddingDateValue.getTime() <= today.getTime() : false;
  const nameChangeReadyCount = nameChangePlan.steps.filter((step) => step.status === 'ready').length;
  const nameChangeCompletedCount = nameChangePlan.steps.filter((step) => step.executionStatus === 'complete').length;
  const nameChangeHasExecutionActivity = (nameChangePlan.summary.executionCounts?.in_progress ?? 0) > 0 || (nameChangePlan.summary.executionCounts?.complete ?? 0) > 0;
  const nameChangeCard = buildNameChangeOverviewCardModel({
    hasWorkspace: true,
    workflowStatus: deriveNameChangeLifecycleStatus(nameChangePlan),
    hasExecutionActivity: nameChangeHasExecutionActivity,
  });
  const nameChangeInsights = buildNameChangeOverviewInsights({ plan: nameChangePlan, reminders: [] });
  const milestoneStatusLabels = {
    ready: 'ready',
    upcoming: 'up next',
    blocked: 'blocked',
    in_progress: 'in progress',
    complete: 'done',
  } as const;
  const milestoneHighlights = (nameChangePlan.summary.milestoneChecklist ?? []).filter((milestone) => [
    'milestone-legal-proof',
    'milestone-ssa',
    'milestone-photo-id',
    'milestone-passport',
    'milestone-payroll',
    'milestone-tax',
    'milestone-downstream-rollout',
  ].includes(milestone.id));
  const nextNameChangeMilestone = nameChangePlan.summary.milestoneChecklist?.find((milestone) => milestone.status !== 'complete') ?? null;
  const blockedNameChangeMilestones = nameChangePlan.summary.milestoneChecklist?.filter((milestone) => milestone.status === 'blocked').length ?? 0;
  const downstreamCoverage = nameChangePlan.summary.institutionCategoryCoverage ?? [];
  const downstreamReadyCount = downstreamCoverage.filter((category) => category.status === 'ready').length;
  const downstreamInProgressCount = downstreamCoverage.filter((category) => category.status === 'in_progress').length;
  const downstreamUpcomingCount = downstreamCoverage.filter((category) => category.status === 'upcoming').length;
  const taxPayrollCoverage = downstreamCoverage.filter((category) => category.id === 'legal_government' || category.id === 'work_insurance');
  const taxPayrollLabel = taxPayrollCoverage.length > 0
    ? taxPayrollCoverage.map((category) => category.label).join(' + ')
    : 'Tax and payroll rollout';
  const taxPayrollStatus = taxPayrollCoverage.some((category) => category.status === 'in_progress')
    ? 'in progress'
    : taxPayrollCoverage.some((category) => category.status === 'ready')
      ? 'ready'
      : taxPayrollCoverage.some((category) => category.status === 'complete')
        ? 'complete'
        : taxPayrollCoverage.some((category) => category.status === 'blocked')
          ? 'blocked'
          : 'upcoming';
  const nameChangeReminderAttention = summarizeNameChangeReminderAttention(
    deriveNameChangeReminderAttention(
      mapReminderSuggestionsToInputs(buildNameChangeReminderSuggestions(nameChangePlan)),
      nameChangePlan,
    ),
  );
  const planningDecision = buildPlanningOverviewDecisionCard({
    tasks,
    budgetItems,
    vendors,
    seatingReadiness,
    daysUntilWedding: weddingDateValue ? Math.ceil((weddingDateValue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null,
    itineraryEventCount,
  });
  const coupleFocus = buildCoupleFocusModel({
    daysUntilWedding: weddingDateValue ? Math.ceil((weddingDateValue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null,
    isPublished: true,
    isArchiveLike: isPostWedding,
    privacyMode,
    publishBlockerCount: 0,
    pendingGuestCount: 0,
    contactGapCount: 0,
    overdueTaskCount: overdueTasks.length,
    dueSoonVendorCount: dueSoonVendors.length,
    seatingUnassignedCount: seatingReadiness.unassigned,
  });

  const handleCoupleFocusAction = (step: CoupleFocusStep) => {
    if (step.target === 'seating') {
      if (typeof window !== 'undefined') {
        window.location.assign('/dashboard/seating');
      }
      return;
    }
    if (step.target === 'coordinator') {
      if (typeof window !== 'undefined') {
        window.location.assign('/dashboard/coordinator');
      }
      return;
    }
    if (step.target === 'planning') {
      onTabChange('overview');
      return;
    }
    if (step.target === 'planning-tasks') {
      onTabChange('tasks');
      return;
    }
    if (step.target === 'planning-vendors') {
      onTabChange('vendors');
      return;
    }
    if (step.target === 'itinerary') {
      if (typeof window !== 'undefined') {
        window.location.assign('/dashboard/itinerary#itinerary-readiness');
      }
      return;
    }
    if (typeof window !== 'undefined') {
      const routeByTarget: Record<Exclude<CoupleFocusStep['target'], 'planning' | 'planning-tasks' | 'planning-vendors' | 'itinerary' | 'seating' | 'coordinator'>, string> = {
        'builder-launch': '/dashboard/builder#launch-confidence',
        'builder-polish': '/dashboard/builder#builder-concierge',
        guests: '/dashboard/guests',
        messages: '/dashboard/messages',
        settings: '/dashboard/settings?tab=site#guest-access-handoff',
        photos: '/dashboard/photos',
        vault: '/dashboard/vault',
      };
      window.location.assign(routeByTarget[step.target as keyof typeof routeByTarget]);
    }
  };

  return (
    <div className="space-y-6">
      <Card padding="md" className="border-primary/20 bg-primary/[0.04]">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Couple focus</p>
              <h3 className="mt-1 text-base font-semibold text-text-primary">{coupleFocus.headline}</h3>
              <p className="mt-1.5 text-sm leading-6 text-text-secondary">{coupleFocus.summary}</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {coupleFocus.steps.map((step) => (
              <div key={step.id} className="rounded-2xl border border-border-subtle bg-white px-4 py-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-text-primary">{step.title}</p>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    step.status === 'current'
                      ? 'border border-primary/20 bg-primary-light text-primary'
                      : step.status === 'next'
                        ? 'border border-warning/20 bg-warning-light text-warning'
                        : 'border border-border-subtle bg-surface-subtle text-text-secondary'
                  }`}>
                    {getFlowStatusLabel(step.status)}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-text-secondary">{step.detail}</p>
                <button
                  type="button"
                  onClick={() => handleCoupleFocusAction(step)}
                  className="mt-3 inline-flex min-h-[36px] items-center rounded-full border border-border bg-white px-3.5 py-2 text-sm font-medium text-text-primary transition hover:border-primary/40 hover:text-primary"
                >
                  {step.ctaLabel}
                </button>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <PlanningDecisionCard
        model={planningDecision}
        onAction={(target) => {
          if (target === 'seating') {
            if (typeof window !== 'undefined') {
              window.location.assign('/dashboard/seating');
            }
            return;
          }
          if (target === 'itinerary') {
            if (typeof window !== 'undefined') {
              window.location.assign('/dashboard/itinerary#itinerary-readiness');
            }
            return;
          }
          onTabChange(target);
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => onTabChange('tasks')}
          className="text-left"
        >
          <Card padding="md" className={`h-full transition-shadow hover:shadow-md ${overdueTasks.length > 0 ? 'border-error/40 bg-error/5' : ''}`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${overdueTasks.length > 0 ? 'bg-error/10' : 'bg-surface-subtle'}`}>
                <AlertTriangle className={`w-5 h-5 ${overdueTasks.length > 0 ? 'text-error' : 'text-text-tertiary'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{overdueTasks.length}</p>
                <p className="text-sm text-text-secondary">Needs attention</p>
              </div>
            </div>
          </Card>
        </button>

        <button onClick={() => onTabChange('tasks')} className="text-left">
          <Card padding="md" className="h-full transition-shadow hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{upcomingTasks.length}</p>
                <p className="text-sm text-text-secondary">Coming up this week</p>
              </div>
            </div>
          </Card>
        </button>

        <button onClick={() => onTabChange('budget')} className="text-left">
          <Card padding="md" className="h-full transition-shadow hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary-light">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{fmt(totalActual)}</p>
                <p className="text-sm text-text-secondary">Spent so far vs {fmt(totalEstimated)} planned</p>
              </div>
            </div>
          </Card>
        </button>

        <button onClick={() => onTabChange('vendors')} className="text-left">
          <Card padding="md" className={`h-full transition-shadow hover:shadow-md ${unpaidVendorBalance > 0 ? 'border-warning/40' : ''}`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${unpaidVendorBalance > 0 ? 'bg-warning/10' : 'bg-surface-subtle'}`}>
                <DollarSign className={`w-5 h-5 ${unpaidVendorBalance > 0 ? 'text-warning' : 'text-text-tertiary'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{fmt(unpaidVendorBalance)}</p>
                <p className="text-sm text-text-secondary">Still to pay vendors</p>
              </div>
            </div>
          </Card>
        </button>
      </div>

      {isPostWedding && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => routeToNameChangeLane(nameChangeCard.plannerHref, onTabChange)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              routeToNameChangeLane(nameChangeCard.plannerHref, onTabChange);
            }
          }}
          className="block w-full text-left"
        >
          <Card padding="md" className="border-primary/25 bg-primary/5 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-primary/10 p-2">
                  <HeartHandshake className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Post-wedding name change assistant</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-text-secondary">Free assistant · status vault · proof tracking</p>
                  <p className="mt-1 text-sm font-medium text-text-primary">{nameChangeCard.headline}</p>
                  <p className="mt-1 text-sm text-text-secondary">{nameChangeCard.helperCopy}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-border-subtle bg-white px-3 py-3">
                      <p className="text-[11px] uppercase tracking-wide text-text-secondary">Main focus</p>
                      <p className="mt-1 text-sm font-medium text-text-primary">{nameChangeCard.focusTitle}</p>
                      <p className="mt-1 text-xs leading-5 text-text-secondary">{nameChangeCard.focusDetail}</p>
                    </div>
                    <div className="rounded-xl border border-border-subtle bg-white px-3 py-3">
                      <p className="text-[11px] uppercase tracking-wide text-text-secondary">Decision rule</p>
                      <p className="mt-1 text-xs leading-5 text-text-secondary">{nameChangeCard.decisionRule}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-text-secondary">
                    {nameChangeCompletedCount} complete · {nameChangeReadyCount} ready now
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-text-secondary">{nameChangeCard.statusLabel}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-white px-2 py-1 text-text-secondary shadow-sm">
                      {nameChangeReminderAttention.actionableNow} reminder{nameChangeReminderAttention.actionableNow === 1 ? '' : 's'} actionable now
                    </span>
                    <span className="rounded-full bg-white px-2 py-1 text-text-secondary shadow-sm">
                      {blockedNameChangeMilestones} blocked milestone{blockedNameChangeMilestones === 1 ? '' : 's'}
                    </span>
                    <span className="rounded-full bg-white px-2 py-1 text-text-secondary shadow-sm">
                      {downstreamReadyCount} downstream categor{downstreamReadyCount === 1 ? 'y' : 'ies'} ready · {downstreamInProgressCount} in progress · {downstreamUpcomingCount} upcoming
                    </span>
                    {nameChangeReminderAttention.stale > 0 ? (
                      <span className="rounded-full bg-amber-500/15 px-2 py-1 text-amber-200">
                        {nameChangeReminderAttention.stale} stale follow-up{nameChangeReminderAttention.stale === 1 ? '' : 's'}
                      </span>
                    ) : null}
                  </div>
                  {milestoneHighlights.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {milestoneHighlights.map((milestone) => (
                        <span key={milestone.id} className="rounded-full bg-white px-2 py-1 text-text-secondary shadow-sm">
                          {milestone.label}: <span className="font-medium text-text-primary">{milestoneStatusLabels[milestone.status]}</span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {nextNameChangeMilestone ? (
                    <p className="mt-3 text-xs text-text-secondary">
                      Concrete resume point:{' '}
                      <button
                        type="button"
                        className="font-medium text-text-primary underline underline-offset-2"
                        onClick={(event) => {
                          event.stopPropagation();
                          routeToNameChangeLane(nameChangeCard.plannerHref, onTabChange);
                        }}
                      >
                        {nextNameChangeMilestone.label}
                      </button>
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-text-secondary">Optional next step: {nameChangeCard.optionalNextStep}</p>
                  {nameChangeInsights.concreteResumeLabel ? (
                    <p className="mt-2 text-xs text-text-secondary">
                      If you want a concrete place to pick back up,{' '}
                      <button
                        type="button"
                        className="font-medium text-text-primary underline underline-offset-2"
                        onClick={(event) => {
                          event.stopPropagation();
                          routeToNameChangeLane(nameChangeCard.plannerHref, onTabChange);
                        }}
                      >
                        {nameChangeInsights.concreteResumeLabel}
                      </button>
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-text-secondary">
                    <button
                      type="button"
                      className="rounded-full bg-white px-2 py-1 text-text-secondary shadow-sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        routeToNameChangeLane(nameChangeInsights.milestoneSummaryHref, onTabChange);
                      }}
                    >
                      {nameChangeInsights.milestoneSummaryLabel}
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-white px-2 py-1 text-text-secondary shadow-sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        routeToNameChangeLane(nameChangeInsights.reminderSummaryHref, onTabChange);
                      }}
                    >
                      {nameChangeInsights.reminderSummaryLabel}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-text-secondary">
                    {taxPayrollLabel}: <span className="font-medium text-text-primary">{taxPayrollStatus}</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-primary shadow-sm">{nameChangeCard.primaryLabel}</span>
                <span className="text-[11px] uppercase tracking-wide text-text-secondary">{nameChangeCard.badgeLabel}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="md">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-text-primary">Seating progress</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Attending guests</span>
              <span className="font-semibold text-text-primary">{seatingReadiness.attending}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Seated guests</span>
              <span className="font-semibold text-success">{seatingReadiness.seated}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Attending guests not seated yet</span>
              <span className={`font-semibold ${seatingReadiness.unassigned > 0 ? 'text-warning' : 'text-text-tertiary'}`}>
                {seatingReadiness.unassigned}
              </span>
            </div>
            {seatingReadiness.attending > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-text-tertiary mb-1">
                  <span>Seating progress</span>
                  <span>{seatingReadiness.attending > 0 ? Math.round((seatingReadiness.seated / seatingReadiness.attending) * 100) : 0}%</span>
                </div>
                <div className="h-2 bg-surface-subtle rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${seatingReadiness.attending > 0 ? (seatingReadiness.seated / seatingReadiness.attending) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-text-primary">Planning progress</h3>
          </div>
          {tasks.length === 0 ? (
            <p className="text-sm text-text-tertiary">No planning items yet. Add them in the Tasks section.</p>
          ) : (
            <div className="space-y-3">
              {(['todo', 'in_progress', 'done'] as const).map(status => {
                const count = tasks.filter(t => t.status === status).length;
                const labels = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
                const colors = { todo: 'bg-surface-subtle', in_progress: 'bg-warning/20', done: 'bg-success/20' };
                const textColors = { todo: 'text-text-secondary', in_progress: 'text-warning', done: 'text-success' };
                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${colors[status]}`} />
                      <span className="text-sm text-text-secondary">{labels[status]}</span>
                    </div>
                    <span className={`font-semibold ${textColors[status]}`}>{count}</span>
                  </div>
                );
              })}
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-text-tertiary mb-1">
                  <span>Completed</span>
                  <span>{Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)}%</span>
                </div>
                <div className="h-2 bg-surface-subtle rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full transition-all"
                    style={{ width: `${(tasks.filter(t => t.status === 'done').length / tasks.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {dueSoonVendors.length > 0 && (
        <Card padding="md" className="border-warning/40 bg-warning/5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <h3 className="font-semibold text-text-primary">Vendor payments coming up</h3>
          </div>
          <div className="space-y-2">
            {dueSoonVendors.map(v => (
              <div key={v.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-text-primary">{v.name}</span>
                  {v.next_payment_due && (
                    <span className="text-text-tertiary ml-2">due {formatVendorDate(v.next_payment_due)}</span>
                  )}
                </div>
                <span className="font-semibold text-warning">{fmt(v.balance_due)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
