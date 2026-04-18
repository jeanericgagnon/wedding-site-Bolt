import { NAME_CHANGE_INSTITUTION_LIBRARY } from './registry';
import type { NameChangePlan, NameChangeReminderSuggestion } from './types';

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
