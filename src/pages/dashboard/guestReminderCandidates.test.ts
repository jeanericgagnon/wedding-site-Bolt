import { describe, expect, it, vi } from 'vitest';

import { getSmsRsvpLinkCandidates, isDueGuestFollowUp } from './guestReminderCandidates';

describe('guestReminderCandidates', () => {
  it('treats invite-linked pending guests as due follow-up even without email', () => {
    vi.setSystemTime(new Date('2026-05-27T12:00:00.000Z'));

    expect(isDueGuestFollowUp({
      id: 'guest-1',
      invite_token: 'invite-123',
      email: null,
      rsvp_status: 'pending',
      invitation_sent_at: '2026-05-20T12:00:00.000Z',
      reminder_last_sent_at: null,
    }, 3 * 24 * 60 * 60 * 1000)).toBe(true);
  });

  it('filters SMS RSVP link candidates by invite token and cadence, not by email presence', () => {
    vi.setSystemTime(new Date('2026-05-27T12:00:00.000Z'));

    const guests = [
      {
        id: 'guest-1',
        invite_token: 'invite-123',
        email: null,
        rsvp_status: 'pending',
        invitation_sent_at: '2026-05-20T12:00:00.000Z',
        reminder_last_sent_at: null,
      },
      {
        id: 'guest-2',
        invite_token: 'invite-456',
        email: 'guest@example.com',
        rsvp_status: 'pending',
        invitation_sent_at: '2026-05-26T12:00:00.000Z',
        reminder_last_sent_at: null,
      },
      {
        id: 'guest-3',
        invite_token: null,
        email: null,
        rsvp_status: 'pending',
        invitation_sent_at: '2026-05-20T12:00:00.000Z',
        reminder_last_sent_at: null,
      },
    ];

    expect(getSmsRsvpLinkCandidates(guests, {
      skipRecentlyInvited: true,
      reminderCadenceMs: 3 * 24 * 60 * 60 * 1000,
    }).map((guest) => guest.id)).toEqual(['guest-1']);
  });

  it('includes all invite-linked guests when recent-send skipping is off', () => {
    expect(getSmsRsvpLinkCandidates([
      {
        id: 'guest-1',
        invite_token: 'invite-123',
        email: null,
        rsvp_status: 'pending',
        invitation_sent_at: null,
        reminder_last_sent_at: null,
      },
      {
        id: 'guest-2',
        invite_token: 'invite-456',
        email: 'guest@example.com',
        rsvp_status: 'confirmed',
        invitation_sent_at: null,
        reminder_last_sent_at: null,
      },
    ], {
      skipRecentlyInvited: false,
      reminderCadenceMs: 3 * 24 * 60 * 60 * 1000,
    }).map((guest) => guest.id)).toEqual(['guest-1', 'guest-2']);
  });
});
