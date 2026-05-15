import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getGuestHubOfflineSnapshotKey, readGuestHubOfflineSnapshot, writeGuestHubOfflineSnapshot } from './guestHubOfflineSnapshot';

describe('guestHubOfflineSnapshot', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T11:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes and reads a guest-safe offline snapshot', () => {
    const snapshot = writeGuestHubOfflineSnapshot('maya-and-leo', {
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
        slug: 'maya-and-leo',
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
    });

    expect(snapshot?.savedAt).toBe('2026-05-14T11:00:00.000Z');
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
});
