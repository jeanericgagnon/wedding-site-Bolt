import { isPendingRsvpStatus } from './rsvpStatus';
import type { GuestLiteForCoordinator } from './coordinatorTypes';

export type CoordinatorDoorStatus = 'ready' | 'watch' | 'done';

export type CoordinatorDoorExceptionState =
  | 'unassigned-seat'
  | 'rsvp-unresolved'
  | 'already-checked-in'
  | 'wrong-event'
  | 'walk-in'
  | 'help-desk'
  | 'manager-decision'
  | 'household-mismatch';

export type CoordinatorDoorStatusContext = {
  currentEventId?: string | null;
  eventGuestIds?: Record<string, Set<string>>;
  eventSeatingConfiguredIds?: Set<string> | null;
  guests?: GuestLiteForCoordinator[];
};

const getCurrentEventGuestIds = (context?: CoordinatorDoorStatusContext) => {
  if (!context?.currentEventId) return null;
  const guestIds = context.eventGuestIds?.[context.currentEventId];
  return guestIds && guestIds.size > 0 ? guestIds : null;
};

export const getCoordinatorEventCheckInAt = (
  guest: GuestLiteForCoordinator,
  currentEventId?: string | null,
) => {
  if (currentEventId) {
    const currentEventArrival = guest.event_arrivals?.[currentEventId];
    if (currentEventArrival?.checked_in_at) return currentEventArrival.checked_in_at;
    const hasAnyEventSpecificArrival = Object.values(guest.event_arrivals ?? {}).some((arrival) => Boolean(arrival.checked_in_at));
    return hasAnyEventSpecificArrival ? null : (guest.checked_in_at ?? null);
  }
  return guest.checked_in_at ?? null;
};

export const getCoordinatorEventTableName = (
  guest: GuestLiteForCoordinator,
  currentEventId?: string | null,
) => guest.event_arrivals?.[currentEventId ?? '']?.table_name ?? null;

export const isCoordinatorGuestInvitedToCurrentEvent = (
  guest: GuestLiteForCoordinator,
  context?: CoordinatorDoorStatusContext,
) => {
  const currentEventGuestIds = getCurrentEventGuestIds(context);
  if (!currentEventGuestIds) return true;
  return currentEventGuestIds.has(guest.id);
};

const hasHouseholdMismatchAtDoor = (
  guest: GuestLiteForCoordinator,
  context?: CoordinatorDoorStatusContext,
) => {
  if (!guest.household_id || !context?.guests?.length) return false;
  const currentEventGuestIds = getCurrentEventGuestIds(context);
  if (!currentEventGuestIds) return false;
  const householdGuests = context.guests.filter((candidate) => candidate.household_id === guest.household_id);
  if (householdGuests.length < 2) return false;
  const invitedCount = householdGuests.filter((candidate) => currentEventGuestIds.has(candidate.id)).length;
  return invitedCount > 0 && invitedCount < householdGuests.length;
};

export const getCoordinatorDoorExceptionStates = (
  guest: GuestLiteForCoordinator,
  context?: CoordinatorDoorStatusContext,
): CoordinatorDoorExceptionState[] => {
  const states = new Set<CoordinatorDoorExceptionState>();
  const checkedInAt = getCoordinatorEventCheckInAt(guest, context?.currentEventId);

  if (checkedInAt) states.add('already-checked-in');
  if (guest.door_route) states.add(guest.door_route);

  if (!checkedInAt && isPendingRsvpStatus(guest.rsvp_status)) {
    states.add('rsvp-unresolved');
  }

  if (!checkedInAt && !isCoordinatorGuestInvitedToCurrentEvent(guest, context)) {
    states.add('wrong-event');
  }

  if (
    !checkedInAt
    && context?.currentEventId
    && context.eventSeatingConfiguredIds?.has(context.currentEventId)
    && isCoordinatorGuestInvitedToCurrentEvent(guest, context)
    && (!getCoordinatorEventTableName(guest, context.currentEventId) || getCoordinatorEventTableName(guest, context.currentEventId) === 'Unassigned')
  ) {
    states.add('unassigned-seat');
  }

  if (!checkedInAt && hasHouseholdMismatchAtDoor(guest, context)) {
    states.add('household-mismatch');
  }

  return Array.from(states);
};

export const getCoordinatorDoorStatus = (
  guest: GuestLiteForCoordinator,
  context?: CoordinatorDoorStatusContext,
): CoordinatorDoorStatus => {
  if (getCoordinatorEventCheckInAt(guest, context?.currentEventId)) return 'done';
  if (getCoordinatorDoorExceptionStates(guest, context).length > 0) return 'watch';
  return 'ready';
};

export const getCoordinatorDoorStatusLabel = (status: CoordinatorDoorStatus) => {
  switch (status) {
    case 'done':
      return 'Checked in';
    case 'watch':
      return 'Needs review';
    default:
      return 'Ready';
  }
};

export const getCoordinatorDoorExceptionStateLabel = (state: CoordinatorDoorExceptionState) => {
  switch (state) {
    case 'already-checked-in':
      return 'Already checked in';
    case 'help-desk':
      return 'Help desk';
    case 'household-mismatch':
      return 'Household mismatch';
    case 'manager-decision':
      return 'Manager decision';
    case 'rsvp-unresolved':
      return 'RSVP unresolved';
    case 'unassigned-seat':
      return 'Unassigned seat';
    case 'walk-in':
      return 'Walk-in';
    case 'wrong-event':
      return 'Wrong event';
    default:
      return state;
  }
};
