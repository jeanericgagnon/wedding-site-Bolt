import type { HydratedNameChangeWorkspace } from '../../lib/nameChange/types';

export interface NameChangeOverviewInsights {
  coreChainLabel: string;
  followOnLabel: string;
  downstreamLabel: string;
  downstreamHref: string;
  concreteResumeLabel: string | null;
  milestoneSummaryLabel: string;
  milestoneSummaryHref: string;
  reminderSummaryLabel: string;
  reminderSummaryHref: string;
}

export function buildNameChangeOverviewInsights(workspace: Pick<HydratedNameChangeWorkspace, 'plan' | 'reminders'>): NameChangeOverviewInsights {
  const basePlannerHref = '/dashboard/planning?tab=nameChange';
  const executionCounts = workspace.plan.summary.executionCounts ?? { todo: workspace.plan.steps.length, in_progress: 0, complete: 0 };
  const milestones = workspace.plan.summary.milestoneChecklist ?? [];
  const milestoneCompleteCount = milestones.filter((milestone) => milestone.status === 'complete').length;
  const nextOpenMilestone = milestones.find((milestone) => milestone.status !== 'complete') ?? null;
  const openReminderCount = workspace.reminders.filter((reminder) => reminder.status === 'pending' || reminder.status === 'scheduled').length;
  const hasExecutionActivity = executionCounts.complete > 0 || executionCounts.in_progress > 0;
  const milestoneSummaryHref = hasExecutionActivity || milestoneCompleteCount > 0
    ? `${basePlannerHref}#target-status-tracking`
    : `${basePlannerHref}#name-change-roadmap`;
  const reminderSummaryHref = openReminderCount > 0
    ? `${basePlannerHref}#target-status-tracking`
    : `${basePlannerHref}#name-change-roadmap`;
  const downstreamHref = openReminderCount > 0 || hasExecutionActivity
    ? `${basePlannerHref}#target-status-tracking`
    : `${basePlannerHref}#name-change-roadmap`;

  return {
    coreChainLabel:
      executionCounts.complete > 0 || executionCounts.in_progress > 0
        ? `${executionCounts.complete} complete · ${executionCounts.in_progress} in progress across the legal identity chain.`
        : 'Certificate, SSA, and DMV stay together so the legal identity chain does not drift.',
    followOnLabel:
      milestoneCompleteCount > 0
        ? `${milestoneCompleteCount} milestone${milestoneCompleteCount === 1 ? '' : 's'} confirmed so passport, payroll, and tax follow-ons can stay in sync.`
        : 'Passport, payroll, and tax updates should reflect the same verified name once the first chain lands.',
    downstreamLabel:
      openReminderCount > 0
        ? `${openReminderCount} reminder${openReminderCount === 1 ? '' : 's'} still open for the long-tail bank, insurance, travel, and loyalty cleanup.`
        : 'Use the long-tail rollout lane for banks, insurance, travel, loyalty, and the rest of the account cleanup.',
    downstreamHref,
    concreteResumeLabel: nextOpenMilestone?.label ?? null,
    milestoneSummaryLabel:
      milestoneCompleteCount > 0
        ? `${milestoneCompleteCount} milestone${milestoneCompleteCount === 1 ? '' : 's'} confirmed`
        : 'Milestones ready to confirm',
    milestoneSummaryHref,
    reminderSummaryLabel:
      openReminderCount > 0
        ? `${openReminderCount} reminder${openReminderCount === 1 ? '' : 's'} open`
        : 'No open reminders',
    reminderSummaryHref,
  };
}
