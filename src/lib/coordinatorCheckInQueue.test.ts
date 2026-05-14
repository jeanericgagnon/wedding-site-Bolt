import { describe, expect, it } from 'vitest';
import { filterCoordinatorCheckInQueue } from './coordinatorCheckInQueue';

const guests = [
  { id: '1', first_name: 'Alex', last_name: 'Rivera', name: 'Alex Rivera', rsvp_status: 'confirmed', checked_in_at: null },
  { id: '2', first_name: 'Sam', last_name: 'Lee', name: 'Sam Lee', rsvp_status: 'confirmed', checked_in_at: '2026-04-19T10:00:00.000Z' },
  { id: '3', first_name: 'Jordan', last_name: 'Kim', name: 'Jordan Kim', rsvp_status: 'pending', checked_in_at: null },
];

describe('coordinatorCheckInQueue', () => {
  it('shows only arrivals by default when asked', () => {
    expect(filterCoordinatorCheckInQueue(guests, '', 'arrivals').map((guest) => guest.id)).toEqual(['1', '3']);
  });

  it('can isolate checked-in guests', () => {
    expect(filterCoordinatorCheckInQueue(guests, '', 'checked-in').map((guest) => guest.id)).toEqual(['2']);
  });

  it('filters by live search query across guest fields', () => {
    expect(filterCoordinatorCheckInQueue(guests, 'jordan', 'all').map((guest) => guest.id)).toEqual(['3']);
    expect(filterCoordinatorCheckInQueue(guests, 'pending', 'all').map((guest) => guest.id)).toEqual(['3']);
  });

  it('keeps the active queue scoped to the current event invitation list', () => {
    expect(filterCoordinatorCheckInQueue(
      guests,
      '',
      'all',
      {
        currentEventId: 'event-1',
        eventGuestIds: {
          'event-1': new Set(['1', '3']),
        },
      },
    ).map((guest) => guest.id)).toEqual(['1', '3']);
  });
});
