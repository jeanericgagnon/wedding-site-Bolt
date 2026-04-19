import type { GuestLiteForCoordinator } from './coordinatorTypes';

export type CoordinatorCheckInFilter = 'arrivals' | 'checked-in' | 'all';

const matchesQuery = (guest: GuestLiteForCoordinator, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [guest.name, guest.first_name || '', guest.last_name || '', guest.rsvp_status || '']
    .some((value) => value.toLowerCase().includes(q));
};

export const filterCoordinatorCheckInQueue = (
  guests: GuestLiteForCoordinator[],
  query: string,
  filter: CoordinatorCheckInFilter,
) => guests.filter((guest) => {
  if (!matchesQuery(guest, query)) return false;
  if (filter === 'arrivals') return !guest.checked_in_at;
  if (filter === 'checked-in') return !!guest.checked_in_at;
  return true;
});
