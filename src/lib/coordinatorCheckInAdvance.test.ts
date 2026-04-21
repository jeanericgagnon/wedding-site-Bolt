import { describe, expect, it } from 'vitest';
import { getNextCoordinatorCheckInFocusId } from './coordinatorCheckInAdvance';

const queue = [
  { id: '1', first_name: 'Alex', last_name: 'Rivera', name: 'Alex Rivera', rsvp_status: 'confirmed', checked_in_at: null },
  { id: '2', first_name: 'Sam', last_name: 'Lee', name: 'Sam Lee', rsvp_status: 'confirmed', checked_in_at: null },
  { id: '3', first_name: 'Jordan', last_name: 'Kim', name: 'Jordan Kim', rsvp_status: 'pending', checked_in_at: null },
];

describe('coordinatorCheckInAdvance', () => {
  it('defaults to the first queue guest when nothing is focused', () => {
    expect(getNextCoordinatorCheckInFocusId({ queue, activeGuestId: null, removeActiveGuest: true })).toBe('1');
  });

  it('advances to the next guest when the active guest leaves the queue', () => {
    expect(getNextCoordinatorCheckInFocusId({ queue, activeGuestId: '1', removeActiveGuest: true })).toBe('2');
    expect(getNextCoordinatorCheckInFocusId({ queue, activeGuestId: '2', removeActiveGuest: true })).toBe('3');
  });

  it('falls back to the previous guest when the last item leaves the queue', () => {
    expect(getNextCoordinatorCheckInFocusId({ queue, activeGuestId: '3', removeActiveGuest: true })).toBe('2');
  });

  it('keeps the same guest focused when they stay in the queue', () => {
    expect(getNextCoordinatorCheckInFocusId({ queue, activeGuestId: '2', removeActiveGuest: false })).toBe('2');
  });
});
