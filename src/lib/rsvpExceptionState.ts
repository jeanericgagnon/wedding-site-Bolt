export type RsvpExceptionState = 'split-household' | 'partial-reply' | 'unnamed-plus-one' | 'manual-response';

export function getRsvpExceptionStates(input: {
  householdStatuses?: string[];
  plusOneAllowed?: boolean | null;
  plusOneName?: string | null;
  attending?: boolean | null;
  mealChoice?: string | null;
  manualHandled?: boolean;
}): RsvpExceptionState[] {
  const states: RsvpExceptionState[] = [];
  const householdStatuses = Array.from(new Set((input.householdStatuses ?? []).filter(Boolean)));

  if (householdStatuses.length > 1) states.push('split-household');
  if (input.attending && !input.mealChoice) states.push('partial-reply');
  if (input.plusOneAllowed && input.attending && !input.plusOneName) states.push('unnamed-plus-one');
  if (input.manualHandled) states.push('manual-response');

  return states;
}
