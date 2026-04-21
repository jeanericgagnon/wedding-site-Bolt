import { describe, expect, it } from 'vitest';
import { buildEventRsvpSyncRows } from './eventRsvpSync';

describe('buildEventRsvpSyncRows', () => {
  it('syncs ceremony and reception rows from the guest RSVP selection', () => {
    expect(buildEventRsvpSyncRows({
      invitations: [
        { event_invitation_id: 'ceremony-invite', event_name: 'Wedding Ceremony' },
        { event_invitation_id: 'reception-invite', event_name: 'Reception Dinner & Dancing' },
        { event_invitation_id: 'welcome-invite', event_name: 'Welcome Dinner' },
      ],
      attending: true,
      attendCeremony: true,
      attendReception: false,
      respondedAt: '2026-04-21T21:30:00.000Z',
    })).toEqual([
      {
        event_invitation_id: 'ceremony-invite',
        attending: true,
        responded_at: '2026-04-21T21:30:00.000Z',
      },
      {
        event_invitation_id: 'reception-invite',
        attending: false,
        responded_at: '2026-04-21T21:30:00.000Z',
      },
      {
        event_invitation_id: 'welcome-invite',
        attending: true,
        responded_at: '2026-04-21T21:30:00.000Z',
      },
    ]);
  });

  it('marks every invited event declined when the guest declines outright', () => {
    expect(buildEventRsvpSyncRows({
      invitations: [
        { event_invitation_id: 'ceremony-invite', event_name: 'Ceremony' },
        { event_invitation_id: 'reception-invite', event_name: 'Reception' },
        { event_invitation_id: 'welcome-invite', event_name: 'Welcome Dinner' },
      ],
      attending: false,
      attendCeremony: false,
      attendReception: false,
      respondedAt: '2026-04-21T21:30:00.000Z',
    })).toEqual([
      {
        event_invitation_id: 'ceremony-invite',
        attending: false,
        responded_at: '2026-04-21T21:30:00.000Z',
      },
      {
        event_invitation_id: 'reception-invite',
        attending: false,
        responded_at: '2026-04-21T21:30:00.000Z',
      },
      {
        event_invitation_id: 'welcome-invite',
        attending: false,
        responded_at: '2026-04-21T21:30:00.000Z',
      },
    ]);
  });
});
