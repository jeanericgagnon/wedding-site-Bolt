import { beforeEach, describe, expect, it } from 'vitest';
import { getGuestHubOfflineSnapshotKey, readGuestHubOfflineSnapshot, writeGuestHubOfflineSnapshot } from './guestHubOfflineSnapshot';

describe('guestHubOfflineSnapshot', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('writes and reads a guest-safe offline snapshot', () => {
    const snapshot = writeGuestHubOfflineSnapshot('  MAYA-and-Leo  ', {
      settings: {
        rsvp_enabled: true,
        photos_enabled: true,
        guestbook_enabled: false,
        registry_enabled: true,
        schedule_enabled: true,
        travel_enabled: true,
        custom_message: 'See you at the harbor.',
        language_default: 'en',
      },
      siteSummary: {
        slug: 'wrong-wedding',
        coupleName1: 'Maya',
        coupleName2: 'Leo',
        weddingDate: '2026-06-15',
      },
      announcement: {
        title: 'Shuttle update',
        detail: 'Meet in the lobby at 3:00 PM.',
        status: 'sent',
      },
      guestState: {
        guestName: 'Alex',
        rsvpStatus: 'confirmed',
      },
      coordinatorHandoff: {
        eventName: 'Ceremony',
        handoffStatus: 'staffed',
        leadName: 'Morgan',
      },
      linkAccess: {
        title: 'Guest-specific link',
        badgeLabel: 'Guest-specific',
        detail: 'This link includes invite-only event details plus RSVP and check-in readback for Alex.',
        summary: 'Guest-specific access is active for this link.',
      },
      travelContext: {
        schedule: [{ id: 'event-1', label: 'Ceremony', startTimeISO: '2026-06-15T15:30:00.000Z' }],
        venues: [{ id: 'venue-1', name: 'Harbor Hall', address: '100 Harbor Road' }],
      },
      savedAt: '2026-05-14T11:00:00.000Z',
    });

    expect(snapshot?.savedAt).toBe('2026-05-14T11:00:00.000Z');
    expect(snapshot?.siteSummary?.slug).toBe('maya-and-leo');
    expect(readGuestHubOfflineSnapshot('maya-and-leo')).toMatchObject({
      settings: expect.objectContaining({ photos_enabled: true }),
      siteSummary: expect.objectContaining({ slug: 'maya-and-leo' }),
      guestState: expect.objectContaining({ guestName: 'Alex' }),
      linkAccess: expect.objectContaining({ title: 'Guest-specific link' }),
    });
  });

  it('drops stale or malformed snapshots', () => {
    localStorage.setItem(getGuestHubOfflineSnapshotKey('maya-and-leo'), JSON.stringify({
      savedAt: '2026-05-01T11:00:00.000Z',
      settings: { photos_enabled: true },
    }));

    expect(readGuestHubOfflineSnapshot('maya-and-leo')).toBeNull();
    expect(localStorage.getItem(getGuestHubOfflineSnapshotKey('maya-and-leo'))).toBeNull();

    localStorage.setItem(getGuestHubOfflineSnapshotKey('maya-and-leo'), '{broken');
    expect(readGuestHubOfflineSnapshot('maya-and-leo')).toBeNull();
  });

  it('drops snapshots whose embedded site summary belongs to another wedding', () => {
    localStorage.setItem(getGuestHubOfflineSnapshotKey('maya-and-leo'), JSON.stringify({
      savedAt: new Date().toISOString(),
      settings: { photos_enabled: true, rsvp_enabled: true },
      siteSummary: {
        slug: 'alex-and-jordan',
        coupleName1: 'Alex',
        coupleName2: 'Jordan',
      },
    }));

    expect(readGuestHubOfflineSnapshot('maya-and-leo')).toBeNull();
    expect(localStorage.getItem(getGuestHubOfflineSnapshotKey('maya-and-leo'))).toBeNull();
  });
});
