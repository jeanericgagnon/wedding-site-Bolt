import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAX_EVENT_RSVP_INVITATION_IDS, normalizeEventRsvpSnapshots } from './eventRsvpCleanup';

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

  it('exports a stable event RSVP invitation-id cap', () => {
    expect(MAX_EVENT_RSVP_INVITATION_IDS).toBe(10000);
  });

  it('keeps event RSVP invitation-id fan-out bounded for delete and snapshot reads', () => {
    const source = readFileSync(join(process.cwd(), 'src/lib/eventRsvpCleanup.ts'), 'utf8');

    expect(source).toContain('MAX_EVENT_RSVP_INVITATION_IDS = 10000');
    expect(source).toContain('const scopedInvitationIds = invitationIds.slice(0, MAX_EVENT_RSVP_INVITATION_IDS);');
    expect(source).toContain(".in('event_invitation_id', scopedInvitationIds);");
  });
});
