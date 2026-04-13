export type CheckInExceptionState = 'unassigned-seat' | 'rsvp-unresolved' | 'already-checked-in';

export function getCheckInExceptionStates(input: {
  checkedInAt?: string | null;
  rsvpStatus?: string | null;
  tableName?: string | null;
}): CheckInExceptionState[] {
  const states: CheckInExceptionState[] = [];
  if (input.checkedInAt) states.push('already-checked-in');
  if (!input.tableName || input.tableName === 'Unassigned') states.push('unassigned-seat');
  if (!input.rsvpStatus || input.rsvpStatus === 'pending') states.push('rsvp-unresolved');
  return states;
}
