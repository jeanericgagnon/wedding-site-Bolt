import { describe, expect, it } from 'vitest';
import { deriveItineraryEventRsvpCounts, shouldLoadEventRsvps } from './itineraryEventRsvpCounts';

describe('shouldLoadEventRsvps', () => {
  it('queries event RSVP rows until the table is proven unavailable', () => {
    expect(shouldLoadEventRsvps(3, null)).toBe(true);
    expect(shouldLoadEventRsvps(3, true)).toBe(true);
    expect(shouldLoadEventRsvps(3, false)).toBe(false);
    expect(shouldLoadEventRsvps(0, null)).toBe(false);
  });
});

describe('deriveItineraryEventRsvpCounts', () => {
  it('counts explicit yes and no responses without treating pending rows as declined', () => {
    expect(deriveItineraryEventRsvpCounts([
      { attending: true },
      { attending: false },
      { attending: null },
    ])).toEqual({
      rsvpCount: 3,
      attendingCount: 1,
      declinedCount: 1,
      pendingCount: 1,
    });
  });

  it('treats newly invited guests without event RSVP rows as pending for the event', () => {
    expect(deriveItineraryEventRsvpCounts([
      { attending: true },
      { attending: false },
    ], 5)).toEqual({
      rsvpCount: 2,
      attendingCount: 1,
      declinedCount: 1,
      pendingCount: 3,
    });
  });

  it('clamps pending at zero if stale duplicate RSVP rows exceed current invitations', () => {
    expect(deriveItineraryEventRsvpCounts([
      { attending: true },
      { attending: true },
      { attending: false },
    ], 2)).toEqual({
      rsvpCount: 3,
      attendingCount: 2,
      declinedCount: 1,
      pendingCount: 0,
    });
  });
});
