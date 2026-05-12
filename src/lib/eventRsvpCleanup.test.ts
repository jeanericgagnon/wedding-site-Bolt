import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_EVENT_RSVP_INVITATION_IDS,
  deleteEventRsvpsByInvitationIds,
  normalizeEventRsvpSnapshots,
  restoreEventRsvpSnapshots,
} from './eventRsvpCleanup';

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: {
    rpc: rpcMock,
  },
}));

describe('normalizeEventRsvpSnapshots', () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

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
    expect(source).toContain("supabase.rpc('event_rsvp_delete_many'");
    expect(source).toContain("supabase.rpc('event_rsvp_upsert_many'");
  });

  it('routes event RSVP delete and restore writes through RPCs', async () => {
    rpcMock.mockResolvedValue({ error: null });

    await expect(deleteEventRsvpsByInvitationIds(['invite-1', 'invite-2'])).resolves.toBeUndefined();
    await expect(restoreEventRsvpSnapshots([
      {
        event_invitation_id: 'invite-1',
        attending: true,
        dietary_restrictions: 'Vegetarian',
        notes: 'Near exit',
        responded_at: '2026-05-01T07:00:00.000Z',
      },
    ])).resolves.toBeUndefined();

    expect(rpcMock).toHaveBeenNthCalledWith(1, 'event_rsvp_delete_many', {
      p_event_invitation_ids: ['invite-1', 'invite-2'],
    });
    expect(rpcMock).toHaveBeenNthCalledWith(2, 'event_rsvp_upsert_many', {
      p_rows: [
        {
          event_invitation_id: 'invite-1',
          attending: true,
          dietary_restrictions: 'Vegetarian',
          notes: 'Near exit',
          responded_at: '2026-05-01T07:00:00.000Z',
        },
      ],
    });
  });
});
