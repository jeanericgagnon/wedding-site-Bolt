import React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Clock, DollarSign, Users, CheckCircle, HeartHandshake } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import type { NameChangePlan } from '../../../lib/nameChange/types';
import {
  buildNameChangeReminderSuggestions,
  deriveNameChangeReminderAttention,
  mapReminderSuggestionsToInputs,
  summarizeNameChangeReminderAttention,
} from '../../../lib/nameChange/reminders';
import { PlanningTask, PlanningBudgetItem, PlanningVendor, type StarterPlannerSuite } from './planningService';
import { formatVendorDate, isVendorDateBetween } from './vendorDate';
import { isTaskDueBetween, isTaskDueOnOrBefore } from './taskDueDate';
import { buildNameChangeOverviewCardModel } from '../nameChangeOverviewCard';
import { buildNameChangeOverviewInsights } from '../nameChangeOverviewInsights';
import { deriveNameChangeLifecycleStatus } from '../nameChangeLifecycleStatus';

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
  weddingDate: string | null;
  nameChangePlan: NameChangePlan;
  onTabChange: (tab: string) => void;
  starterSuite?: StarterPlannerSuite | null;
  onApplyStarterSuite?: () => Promise<void>;
  applyingStarterSuite?: boolean;
  lastStarterSuiteRun?: {
    taskIds: string[];
    budgetItemIds: string[];
    vendorIds: string[];
    createdAt: string;
  } | null;
  onUndoStarterSuite?: () => Promise<void>;
  undoingStarterSuite?: boolean;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export const PlanningOverviewTab: React.FC<Props> = ({
  tasks,
  budgetItems,
  vendors,
  seatingReadiness,
  weddingDate,
  nameChangePlan,
  onTabChange,
  starterSuite,
  onApplyStarterSuite,
  applyingStarterSuite = false,
  lastStarterSuiteRun,
  onUndoStarterSuite,
  undoingStarterSuite = false,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
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
  const routeToNameChangeLane = (primaryHref: string) => {
    const [, hash = ''] = primaryHref.split('#');
    navigate(
      {
        pathname: location.pathname,
        search: location.search,
        hash: `#${hash || 'name-change-roadmap'}`,
      },
      { replace: true },
    );
    onTabChange('nameChange');
  };
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
  const shouldShowStarterSuite = Boolean(starterSuite && onApplyStarterSuite && (tasks.length === 0 || budgetItems.length === 0 || vendors.length === 0));
  const shouldShowStarterSuiteQa = Boolean(
    starterSuite &&
    onApplyStarterSuite &&
    searchParams.has('starterSuiteQa'),
  );
  const applyStarterSuite = onApplyStarterSuite;
  const undoStarterSuite = onUndoStarterSuite;
  const starterUndoCount = lastStarterSuiteRun
    ? lastStarterSuiteRun.taskIds.length + lastStarterSuiteRun.budgetItemIds.length + lastStarterSuiteRun.vendorIds.length
    : 0;

  async function handleApplyStarterSuite() {
    if (!applyStarterSuite) return;
    try {
      await applyStarterSuite();
    } catch {
      toast('Couldn’t add the starter suite right now.', 'error');
    }
  }

  async function handleUndoStarterSuite() {
    if (!undoStarterSuite) return;
    try {
      await undoStarterSuite();
    } catch {
      toast('Couldn’t undo the starter suite right now.', 'error');
    }
  }

  return (
    <div className="space-y-6">
      {lastStarterSuiteRun && undoStarterSuite && starterUndoCount > 0 ? (
        <Card padding="md" className="border-success/30 bg-success/5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-text-primary">Starter suite added</p>
              <p className="mt-1 text-sm text-text-secondary">
                {lastStarterSuiteRun.taskIds.length} tasks, {lastStarterSuiteRun.budgetItemIds.length} budget lines, and {lastStarterSuiteRun.vendorIds.length} vendors were created from your wedding details.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={() => void handleUndoStarterSuite()} disabled={undoingStarterSuite}>
              {undoingStarterSuite ? 'Undoing...' : 'Undo starter suite'}
            </Button>
          </div>
        </Card>
      ) : null}

      {(shouldShowStarterSuite || shouldShowStarterSuiteQa) && starterSuite && applyStarterSuite ? (
        <Card padding="md" className="border-primary/25 bg-primary/5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold text-primary">Planner starter set</p>
              <h2 className="mt-2 text-lg font-semibold text-text-primary">Add a useful first planner</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">
                This adds editable tasks, budget lines, vendor notes, and guest details from the wedding information already on your site.
              </p>
              <div className="mt-3 grid gap-2 text-xs text-text-secondary sm:grid-cols-3">
                <span className="rounded-xl border border-border-subtle bg-white px-3 py-2">{starterSuite.tasks.length} checklist items</span>
                <span className="rounded-xl border border-border-subtle bg-white px-3 py-2">{starterSuite.budgetItems.length} budget lines</span>
                <span className="rounded-xl border border-border-subtle bg-white px-3 py-2">{starterSuite.vendors.length} vendor notes</span>
                <span className="rounded-xl border border-border-subtle bg-white px-3 py-2">{starterSuite.timelineSeeds.length} timeline ideas</span>
                <span className="rounded-xl border border-border-subtle bg-white px-3 py-2">{starterSuite.rsvpQuestionSeeds.length} RSVP questions</span>
                <span className="rounded-xl border border-border-subtle bg-white px-3 py-2">{starterSuite.photoBucketSeeds.length} photo albums</span>
              </div>
              <div className="mt-3 grid gap-3 text-xs text-text-secondary lg:grid-cols-3">
                <div className="rounded-xl border border-border-subtle bg-white/80 p-3">
                  <p className="font-semibold text-text-primary">Schedule ideas</p>
                  <p className="mt-1">{starterSuite.timelineSeeds.slice(0, 3).map((item) => item.title).join(', ')}</p>
                </div>
                <div className="rounded-xl border border-border-subtle bg-white/80 p-3">
                  <p className="font-semibold text-text-primary">Guest setup</p>
                  <p className="mt-1">{starterSuite.rsvpQuestionSeeds.length} RSVP prompts and {starterSuite.guestImportSuggestions.length} import checks.</p>
                </div>
                <div className="rounded-xl border border-border-subtle bg-white/80 p-3">
                  <p className="font-semibold text-text-primary">Photo albums</p>
                  <p className="mt-1">{starterSuite.photoBucketSeeds.slice(0, 3).map((item) => item.name).join(', ')}</p>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs leading-5 text-text-secondary">
                {starterSuite.rationale.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
              <Button type="button" onClick={() => void handleApplyStarterSuite()} disabled={applyingStarterSuite}>
                {applyingStarterSuite ? 'Adding starter set...' : 'Add starter set'}
              </Button>
              <Button type="button" variant="outline" onClick={() => onTabChange('tasks')}>
                Review details
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => onTabChange('tasks')}
          className="text-left"
        >
          <Card padding="md" className={`h-full transition-colors hover:border-primary/25 ${overdueTasks.length > 0 ? 'border-error/40 bg-error/5' : ''}`}>
            <div className="flex items-start gap-3">
              <div className={`rounded-xl p-2 ${overdueTasks.length > 0 ? 'bg-error/10' : 'bg-surface-subtle'}`}>
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
          <Card padding="md" className="h-full transition-colors hover:border-primary/25">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-warning/10 p-2">
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
          <Card padding="md" className="h-full transition-colors hover:border-primary/25">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary-light p-2">
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
          <Card padding="md" className={`h-full transition-colors hover:border-primary/25 ${unpaidVendorBalance > 0 ? 'border-warning/40' : ''}`}>
            <div className="flex items-start gap-3">
              <div className={`rounded-xl p-2 ${unpaidVendorBalance > 0 ? 'bg-warning/10' : 'bg-surface-subtle'}`}>
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
          onClick={() => routeToNameChangeLane(nameChangeCard.plannerHref)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              routeToNameChangeLane(nameChangeCard.plannerHref);
            }
          }}
          className="block w-full text-left"
        >
          <Card padding="md" className="border-primary/25 bg-primary/5 transition-colors hover:border-primary/40">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-primary/10 p-2">
                  <HeartHandshake className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Post-wedding name change assistant</p>
                  <p className="mt-1 text-[11px] text-text-secondary">Saved progress · document checklist</p>
                  <p className="mt-1 text-sm font-medium text-text-primary">{nameChangeCard.headline}</p>
                  <p className="mt-1 text-sm text-text-secondary">{nameChangeCard.helperCopy}</p>
                  <p className="mt-2 text-xs text-text-secondary">
                    {nameChangeCompletedCount} complete · {nameChangeReadyCount} ready now
                  </p>
                  <p className="mt-2 text-xs text-text-secondary">{nameChangeCard.statusLabel}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-xl border border-border-subtle bg-white px-2 py-1 text-text-secondary">
                      {nameChangeReminderAttention.actionableNow} reminder{nameChangeReminderAttention.actionableNow === 1 ? '' : 's'} actionable now
                    </span>
                    <span className="rounded-xl border border-border-subtle bg-white px-2 py-1 text-text-secondary">
                      {blockedNameChangeMilestones} milestone{blockedNameChangeMilestones === 1 ? '' : 's'} waiting on details
                    </span>
                    <span className="rounded-xl border border-border-subtle bg-white px-2 py-1 text-text-secondary">
                      {downstreamReadyCount} place{downstreamReadyCount === 1 ? '' : 's'} ready · {downstreamInProgressCount} started · {downstreamUpcomingCount} later
                    </span>
                    {nameChangeReminderAttention.stale > 0 ? (
                      <span className="rounded-xl border border-primary/20 bg-primary-light px-2 py-1 text-primary">
                        {nameChangeReminderAttention.stale} follow-up{nameChangeReminderAttention.stale === 1 ? '' : 's'} worth checking
                      </span>
                    ) : null}
                  </div>
                  {milestoneHighlights.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {milestoneHighlights.map((milestone) => (
                        <span key={milestone.id} className="rounded-xl border border-border-subtle bg-white px-2 py-1 text-text-secondary">
                          {milestone.label}: <span className="font-medium text-text-primary">{milestoneStatusLabels[milestone.status]}</span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {nextNameChangeMilestone ? (
                    <p className="mt-3 text-xs text-text-secondary">
                      Best place to pick back up:{' '}
                      <button
                        type="button"
                        className="font-medium text-text-primary underline underline-offset-2"
                        onClick={(event) => {
                          event.stopPropagation();
                          routeToNameChangeLane(nameChangeCard.plannerHref);
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
                          routeToNameChangeLane(nameChangeCard.plannerHref);
                        }}
                      >
                        {nameChangeInsights.concreteResumeLabel}
                      </button>
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-text-secondary">
                    <button
                      type="button"
                      className="rounded-xl border border-border-subtle bg-white px-2 py-1 text-text-secondary transition-colors hover:border-primary/25 hover:text-text-primary"
                      onClick={(event) => {
                        event.stopPropagation();
                        routeToNameChangeLane(nameChangeInsights.milestoneSummaryHref);
                      }}
                    >
                      {nameChangeInsights.milestoneSummaryLabel}
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-border-subtle bg-white px-2 py-1 text-text-secondary transition-colors hover:border-primary/25 hover:text-text-primary"
                      onClick={(event) => {
                        event.stopPropagation();
                        routeToNameChangeLane(nameChangeInsights.reminderSummaryHref);
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
                <span className="rounded-xl border border-primary/20 bg-white px-3 py-1 text-xs font-medium text-primary">{nameChangeCard.primaryLabel}</span>
                <span className="text-[11px] text-text-secondary">{nameChangeCard.badgeLabel}</span>
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
                <div className="h-2 overflow-hidden rounded-xl bg-surface-subtle">
                  <div
                    className="h-full rounded-xl bg-primary transition-all"
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
                      <span className={`h-2 w-2 rounded-sm ${colors[status]}`} />
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
                <div className="h-2 overflow-hidden rounded-xl bg-surface-subtle">
                  <div
                    className="h-full rounded-xl bg-success transition-all"
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
