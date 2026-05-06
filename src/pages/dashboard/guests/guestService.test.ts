import { describe, expect, it } from 'vitest';
import { GUEST_DASHBOARD_RSVP_SELECT, toEventInvitationRows } from './guestService';

describe('guestService', () => {
  it('keeps guest RSVP reads explicitly projected', () => {
    expect(GUEST_DASHBOARD_RSVP_SELECT).toContain('guest_id');
    expect(GUEST_DASHBOARD_RSVP_SELECT).toContain('custom_answers');
    expect(GUEST_DASHBOARD_RSVP_SELECT).not.toContain('*');
  });

  it('builds scoped event invitation rows for one guest', () => {
    expect(toEventInvitationRows('guest-1', ['event-a', 'event-b'])).toEqual([
      { guest_id: 'guest-1', event_id: 'event-a' },
      { guest_id: 'guest-1', event_id: 'event-b' },
    ]);
  });
});
