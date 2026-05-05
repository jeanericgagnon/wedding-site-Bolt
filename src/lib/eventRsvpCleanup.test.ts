import { describe, expect, it } from 'vitest';
import { normalizeEventRsvpSnapshots } from './eventRsvpCleanup';

describe('normalizeEventRsvpSnapshots', () => {
  it('preserves event RSVP context needed for rollback restores', () => {
    expect(normalizeEventRsvpSnapshots([
      {
        event_invitation_id: 'invite-1',
        attending: true,
        dietary_restrictions: 'Vegetarian',
        notes: 'Needs aisle seat',
        responded_at: '2026-05-01T07:00:00.000Z',
      },
    ])).toEqual([
      {
        event_invitation_id: 'invite-1',
        attending: true,
        dietary_restrictions: 'Vegetarian',
        notes: 'Needs aisle seat',
        responded_at: '2026-05-01T07:00:00.000Z',
      },
    ]);
  });

  it('drops malformed rows instead of restoring ambiguous event RSVP state', () => {
    expect(normalizeEventRsvpSnapshots([
      null,
      { event_invitation_id: 'invite-1', attending: null },
      { event_invitation_id: 123, attending: true },
      { event_invitation_id: 'invite-2', attending: false, dietary_restrictions: 9, notes: undefined },
    ])).toEqual([
      {
        event_invitation_id: 'invite-2',
        attending: false,
        dietary_restrictions: null,
        notes: null,
        responded_at: null,
      },
    ]);
  });
});
