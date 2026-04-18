import { NAME_CHANGE_INSTITUTION_LIBRARY } from './registry';
import type { NameChangePlan, NameChangeReminderInput, NameChangeReminderSuggestion, NameChangeReminderSummary } from './types';

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
  });
}

export function updateNameChangeReminderStatus(
  reminders: NameChangeReminderInput[],
  reminderKey: string,
  status: NameChangeReminderInput['status'],
): NameChangeReminderInput[] {
  return reminders.map((reminder) => reminder.reminder_key === reminderKey ? { ...reminder, status } : reminder);
}
