import {
  getCoordinatorDoorExceptionStateLabel,
  getCoordinatorDoorExceptionStates,
  getCoordinatorEventCheckInAt,
  getCoordinatorEventTableName,
  type CoordinatorDoorStatusContext,
} from './coordinatorCheckInStatus';
import type { GuestLiteForCoordinator } from './coordinatorTypes';

export type CoordinatorCheckInFilter = 'arrivals' | 'checked-in' | 'all';

const matchesQuery = (
  guest: GuestLiteForCoordinator,
  query: string,
  context?: CoordinatorDoorStatusContext,
) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    guest.name,
    guest.first_name || '',
    guest.last_name || '',
    guest.rsvp_status || '',
    guest.group_name || '',
    getCoordinatorEventTableName(guest, context?.currentEventId) || '',
    ...getCoordinatorDoorExceptionStates(guest, context).map(getCoordinatorDoorExceptionStateLabel),
  ]
    .some((value) => value.toLowerCase().includes(q));
};

export const filterCoordinatorCheckInQueue = (
  guests: GuestLiteForCoordinator[],
  query: string,
  filter: CoordinatorCheckInFilter,
  context?: CoordinatorDoorStatusContext,
) => guests.filter((guest) => {
  const checkedInAt = getCoordinatorEventCheckInAt(guest, context?.currentEventId);
  if (!matchesQuery(guest, query, context)) return false;
  if (filter === 'arrivals') return !checkedInAt;
  if (filter === 'checked-in') return !!checkedInAt;
  return true;
});
