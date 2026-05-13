import { describe, expect, it } from 'vitest';
import { buildCoordinatorCheckInBoard } from './coordinatorCheckInBoard';

describe('coordinatorCheckInBoard', () => {
  const guests = [
    { id: 'g1', first_name: 'Alex', last_name: 'Rivera', name: 'Alex Rivera', rsvp_status: 'confirmed', checked_in_at: null },
    { id: 'g2', first_name: 'Sam', last_name: 'Lee', name: 'Sam Lee', rsvp_status: 'pending', checked_in_at: null },
    { id: 'g3', first_name: 'Jordan', last_name: 'Kim', name: 'Jordan Kim', rsvp_status: 'confirmed', checked_in_at: '2026-04-22T14:00:00.000Z' },
    { id: 'g4', first_name: 'Taylor', last_name: 'Ng', name: 'Taylor Ng', rsvp_status: 'confirmed', checked_in_at: null },
  ];

  it('flags review pressure while keeping the next ready arrival visible', () => {
    expect(buildCoordinatorCheckInBoard({
      guests,
      activeGuest: guests[0],
      currentEventName: 'Ceremony',
    })).toEqual({
      eventLabel: 'Ceremony door',
      eventProgressLabel: '1 in · 3 waiting',
      statusLabel: 'Ceremony review is active',
      tone: 'warning',
      activeLabel: 'Alex Rivera',
      nextReadyLabel: 'Taylor Ng',
      queueLabel: '2 ready · 1 review · 1 checked in',
      reviewLabel: '1 need review before arrival',
    });
  });

  it('shows a clear door when arrivals are already covered', () => {
    expect(buildCoordinatorCheckInBoard({
      guests: [{ id: 'g3', first_name: 'Jordan', last_name: 'Kim', name: 'Jordan Kim', rsvp_status: 'confirmed', checked_in_at: '2026-04-22T14:00:00.000Z' }],
      activeGuest: null,
      currentEventName: null,
    })).toEqual({
      eventLabel: 'Door board',
      eventProgressLabel: '1 in · 0 waiting',
      statusLabel: 'Arrivals are covered',
      tone: 'neutral',
      activeLabel: 'No active guest selected',
      nextReadyLabel: 'No other ready arrival queued',
      queueLabel: '0 ready · 0 review · 1 checked in',
      reviewLabel: 'No review holds',
    });
  });
});
