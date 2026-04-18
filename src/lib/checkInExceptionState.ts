import { isPendingRsvpStatus } from './rsvpStatus';

export type CheckInExceptionState = 'unassigned-seat' | 'rsvp-unresolved' | 'already-checked-in';

export function getCheckInExceptionStates(input: {
  checkedInAt?: string | null;
  rsvpStatus?: string | null;
  tableName?: string | null;
}): CheckInExceptionState[] {
  const states: CheckInExceptionState[] = [];
  if (input.checkedInAt) states.push('already-checked-in');
  if (!input.tableName || input.tableName === 'Unassigned') states.push('unassigned-seat');
  if (isPendingRsvpStatus(input.rsvpStatus)) states.push('rsvp-unresolved');
  return states;
}
