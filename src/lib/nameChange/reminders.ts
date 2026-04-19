import { NAME_CHANGE_INSTITUTION_LIBRARY } from './registry';
import type { NameChangePlan, NameChangeReminderAttentionItem, NameChangeReminderAttentionSummary, NameChangeReminderInput, NameChangeReminderSuggestion, NameChangeReminderSummary } from './types';

const REMINDER_STALE_AFTER_MS = 1000 * 60 * 60 * 72;

function urgencyFromOffset(days: number): NameChangeReminderSuggestion['urgency'] {
  if (days <= 2) return 'high';
  if (days <= 7) return 'medium';
  return 'low';
}

export function buildNameChangeReminderSuggestions(plan: NameChangePlan): NameChangeReminderSuggestion[] {
  const suggestions: NameChangeReminderSuggestion[] = [];

  if (plan.profile.passportNeedsUpdate) {
    suggestions.push({
      id: 'reminder-passport-followup',
      label: 'Check passport name-match progress',
      suggestedOffsetDays: plan.profile.urgencyLevel === 'expedited' ? 1 : 4,
      reason: 'Travel-facing identity usually needs an early follow-up once SSA or DMV is moving.',
      dependsOnStepId: 'federal-passport',
      urgency: plan.profile.urgencyLevel === 'expedited' ? 'high' : 'medium',
    });
  }

  NAME_CHANGE_INSTITUTION_LIBRARY.forEach((institution) => {
    const matchingStep = plan.steps.find((step) => step.id === `institution-${institution.key}`);
    if (!matchingStep) return;

    suggestions.push({
      id: `reminder-${institution.key}`,
      label: `Follow up on ${institution.label}`,
      suggestedOffsetDays: institution.reminderDaysAfterPrimaryId,
      reason: institution.notes,
      dependsOnStepId: matchingStep.id,
      urgency: urgencyFromOffset(institution.reminderDaysAfterPrimaryId),
    });
  });

  return suggestions.sort((a, b) => a.suggestedOffsetDays - b.suggestedOffsetDays || a.label.localeCompare(b.label));
}

export function mapReminderSuggestionsToInputs(suggestions: NameChangeReminderSuggestion[]): NameChangeReminderInput[] {
  return suggestions.map((suggestion) => ({
    reminder_key: suggestion.id,
    label: suggestion.label,
    reason: suggestion.reason,
    depends_on_step_id: suggestion.dependsOnStepId,
    suggested_offset_days: suggestion.suggestedOffsetDays,
    urgency: suggestion.urgency,
    status: 'pending',
  }));
}

export function summarizeNameChangeReminders(reminders: NameChangeReminderInput[]): NameChangeReminderSummary {
  return reminders.reduce<NameChangeReminderSummary>((summary, reminder) => {
    summary.total += 1;
    summary[reminder.status] += 1;
    if (reminder.urgency === 'high' && (reminder.status === 'pending' || reminder.status === 'scheduled')) {
      summary.highUrgencyOpen += 1;
    }
    return summary;
  }, {
    total: 0,
    pending: 0,
    scheduled: 0,
    sent: 0,
    dismissed: 0,
    highUrgencyOpen: 0,
    staleAttentionOpen: 0,
  });
}

export function summarizeNameChangeReminderAttention(
  attentionItems: NameChangeReminderAttentionItem[],
  options?: { hasRecentStart?: boolean; hasRecentCompletion?: boolean },
): NameChangeReminderAttentionSummary {
  const staleTodo = attentionItems.filter((item) => item.isStale && item.dependentStepExecutionStatus === 'todo').length;
  const staleInProgress = attentionItems.filter((item) => item.isStale && item.dependentStepExecutionStatus === 'in_progress').length;
  const critical = attentionItems.filter((item) => item.priorityTier === 'critical').length;
  const elevated = attentionItems.filter((item) => item.priorityTier === 'elevated').length;
  const normal = attentionItems.filter((item) => (item.priorityTier ?? 'normal') === 'normal').length;
  const actionableNow = attentionItems.filter((item) => item.actionability === 'actionable_now').length;
  const blockedByUntouchedStep = attentionItems.filter((item) => item.actionability === 'blocked_by_untouched_step').length;
  const blockedAndStale = attentionItems.filter((item) => item.actionability === 'blocked_by_untouched_step' && item.isStale).length;
  const actionablePriority = attentionItems.filter((item) => item.actionability === 'actionable_now' && (item.priorityTier === 'critical' || item.priorityTier === 'elevated')).length;
  const actionableNormal = attentionItems.filter((item) => item.actionability === 'actionable_now' && (item.priorityTier ?? 'normal') === 'normal').length;
  const actionableAndStale = attentionItems.filter((item) => item.actionability === 'actionable_now' && item.isStale).length;
  const actionableStalePriority = attentionItems.filter((item) => item.actionability === 'actionable_now' && item.isStale && (item.priorityTier === 'critical' || item.priorityTier === 'elevated')).length;
  const actionableStaleNormal = attentionItems.filter((item) => item.actionability === 'actionable_now' && item.isStale && (item.priorityTier ?? 'normal') === 'normal').length;
  const blockedStalePriority = attentionItems.filter((item) => item.actionability === 'blocked_by_untouched_step' && item.isStale && (item.priorityTier === 'critical' || item.priorityTier === 'elevated')).length;
  const blockedStaleNormal = attentionItems.filter((item) => item.actionability === 'blocked_by_untouched_step' && item.isStale && (item.priorityTier ?? 'normal') === 'normal').length;

  return {
    total: attentionItems.length,
    stale: attentionItems.filter((item) => item.isStale).length,
    staleTodo,
    staleInProgress,
    highUrgency: attentionItems.filter((item) => item.urgency === 'high').length,
    critical,
    elevated,
    normal,
    actionableNow,
    blockedByUntouchedStep,
    blockedAndStale,
    actionablePriority,
    actionableNormal,
    actionableAndStale,
    actionableStalePriority,
    actionableStaleNormal,
    blockedStalePriority,
    blockedStaleNormal,
    dominantRiskLane: (() => {
      const blockedStaleScore = blockedAndStale;
      const staleActionableScore = actionableAndStale;
      const routineActionableScore = actionableNow - actionableAndStale;

      const entries = [
        ['blocked-stale', blockedStaleScore],
        ['stale-actionable', staleActionableScore],
        ['routine-actionable', routineActionableScore],
      ] as const;

      const sorted = [...entries].sort((a, b) => b[1] - a[1]);
      if (sorted[0][1] === sorted[1][1]) return 'mixed';
      return sorted[0][0];
    })(),
    staleActionablePosture: actionableStalePriority === actionableStaleNormal
      ? 'mixed'
      : actionableStalePriority > actionableStaleNormal
        ? 'priority-heavy'
        : 'normal-heavy',
    blockedStalePosture: blockedStalePriority === blockedStaleNormal
      ? 'mixed'
      : blockedStalePriority > blockedStaleNormal
        ? 'priority-heavy'
        : 'normal-heavy',
    attentionPosture: actionableNow === blockedByUntouchedStep
      ? 'mixed'
      : actionableNow > blockedByUntouchedStep
        ? 'actionable-heavy'
        : 'blocked-heavy',
    stalePriority: staleTodo === staleInProgress ? 'mixed' : staleTodo > staleInProgress ? 'untouched' : 'moving',
    agingWithoutExecution: (staleTodo + staleInProgress) > 0 && !options?.hasRecentStart && !options?.hasRecentCompletion,
    agingWithoutExecutionLane: (() => {
      const aging = (staleTodo + staleInProgress) > 0 && !options?.hasRecentStart && !options?.hasRecentCompletion;
      if (!aging) return 'none';
      if (blockedAndStale === actionableAndStale) return 'mixed';
      return blockedAndStale > actionableAndStale ? 'blocked-stale' : 'stale-actionable';
    })(),
    agingWithoutExecutionPosture: (() => {
      const aging = (staleTodo + staleInProgress) > 0 && !options?.hasRecentStart && !options?.hasRecentCompletion;
      if (!aging) return 'none';
      if (blockedAndStale === actionableAndStale) return 'mixed';
      return blockedAndStale > actionableAndStale ? 'blocked-heavy' : 'actionable-heavy';
    })(),
    actionableFreshPosture: (() => {
      if (actionableNow === 0) return 'none';
      const freshActionable = actionableNow - actionableAndStale;
      if (actionableAndStale === freshActionable) return 'mixed';
      return actionableAndStale > freshActionable ? 'stale-heavy' : 'fresh-heavy';
    })(),
  };
}

export function updateNameChangeReminderStatus(
  reminders: NameChangeReminderInput[],
  reminderKey: string,
  status: NameChangeReminderInput['status'],
): NameChangeReminderInput[] {
  return reminders.map((reminder) => reminder.reminder_key === reminderKey ? { ...reminder, status } : reminder);
}

export function bulkUpdateNameChangeReminderStatus(
  reminders: NameChangeReminderInput[],
  reminderKeys: string[],
  status: NameChangeReminderInput['status'],
): NameChangeReminderInput[] {
  const keys = new Set(reminderKeys);
  return reminders.map((reminder) => keys.has(reminder.reminder_key) ? { ...reminder, status } : reminder);
}

export function syncNameChangeRemindersWithStepExecution(
  reminders: NameChangeReminderInput[],
  stepId: string,
  executionStatus: 'todo' | 'in_progress' | 'complete',
): NameChangeReminderInput[] {
  return reminders.map((reminder) => {
    if (reminder.depends_on_step_id !== stepId) return reminder;

    if (executionStatus === 'complete') {
      return { ...reminder, status: 'sent' };
    }

    if (executionStatus === 'in_progress') {
      return {
        ...reminder,
        status: reminder.status === 'dismissed' ? 'dismissed' : 'scheduled',
      };
    }

    return {
      ...reminder,
      status: reminder.status === 'dismissed' ? 'dismissed' : 'pending',
    };
  });
}

export function deriveNameChangeReminderAttention(
  reminders: NameChangeReminderInput[],
  plan: NameChangePlan,
  nowIso: string = new Date().toISOString(),
): NameChangeReminderAttentionItem[] {
  const attentionItems: NameChangeReminderAttentionItem[] = [];
  const nowMs = new Date(nowIso).getTime();

  reminders
    .filter((reminder) => reminder.status === 'pending' || reminder.status === 'scheduled')
    .forEach((reminder) => {
      const dependentStep = plan.steps.find((step) => step.id === reminder.depends_on_step_id);
      if (!dependentStep || dependentStep.executionStatus === 'complete') return;

      const lastTouchedAt = dependentStep.executionUpdatedAt ?? null;
      const isStale = lastTouchedAt ? (nowMs - new Date(lastTouchedAt).getTime()) >= REMINDER_STALE_AFTER_MS : true;
      const priorityTier = isStale && reminder.urgency === 'high' && (dependentStep.executionStatus ?? 'todo') === 'todo'
        ? 'critical'
        : isStale || reminder.urgency === 'high'
          ? 'elevated'
          : 'normal';
      const actionability = (dependentStep.executionStatus ?? 'todo') === 'todo'
        ? 'blocked_by_untouched_step'
        : 'actionable_now';

      attentionItems.push({
        reminderKey: reminder.reminder_key,
        label: reminder.label,
        dependsOnStepId: reminder.depends_on_step_id,
        dependentStepTitle: dependentStep.title,
        dependentStepExecutionStatus: dependentStep.executionStatus ?? 'todo',
        reminderStatus: reminder.status,
        urgency: reminder.urgency,
        priorityTier,
        actionability,
        suggestedOffsetDays: reminder.suggested_offset_days,
        lastTouchedAt,
        isStale,
      });
    });

  return attentionItems.sort((a, b) => {
      const priorityRank = { critical: 0, elevated: 1, normal: 2 };
      const urgencyRank = { high: 0, medium: 1, low: 2 };
      return priorityRank[a.priorityTier ?? 'normal'] - priorityRank[b.priorityTier ?? 'normal']
        || Number(b.isStale) - Number(a.isStale)
        || urgencyRank[a.urgency] - urgencyRank[b.urgency]
        || a.suggestedOffsetDays - b.suggestedOffsetDays
        || a.label.localeCompare(b.label);
    });
}
