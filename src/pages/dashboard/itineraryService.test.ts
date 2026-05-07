import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addItineraryEventGuestInvitation,
  buildItineraryTemplateInsertRows,
  buildScheduleSectionEvents,
  inviteAllGuestsToItineraryEvent,
  ITINERARY_EVENT_GUEST_PICKER_SELECT,
  loadItineraryEventGuestManagerSnapshot,
  MAX_ITINERARY_EVENT_GUESTS,
  MAX_ITINERARY_EVENT_INVITATIONS,
  removeAllGuestsFromItineraryEvent,
  removeItineraryEventGuestInvitation,
  resolveItinerarySiteId,
  buildWeddingSchedule,
} from './itineraryService';
import { combineDateAndTimeISO } from './itineraryDateTime';

const {
  getUserMock,
  fromMock,
  resolveActiveSiteForUserMock,
  getEventRsvpSnapshotsByInvitationIdsMock,
  deleteEventRsvpByInvitationIdMock,
  deleteEventRsvpsByInvitationIdsMock,
  restoreEventRsvpSnapshotsMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  fromMock: vi.fn(),
  resolveActiveSiteForUserMock: vi.fn(),
  getEventRsvpSnapshotsByInvitationIdsMock: vi.fn(),
  deleteEventRsvpByInvitationIdMock: vi.fn(),
  deleteEventRsvpsByInvitationIdsMock: vi.fn(),
  restoreEventRsvpSnapshotsMock: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: getUserMock,
    },
    from: fromMock,
  },
}));

vi.mock('../../lib/activeSite', () => ({
  resolveActiveSiteForUser: resolveActiveSiteForUserMock,
}));

vi.mock('../../lib/eventRsvpCleanup', () => ({
  getEventRsvpSnapshotsByInvitationIds: getEventRsvpSnapshotsByInvitationIdsMock,
  deleteEventRsvpByInvitationId: deleteEventRsvpByInvitationIdMock,
  deleteEventRsvpsByInvitationIds: deleteEventRsvpsByInvitationIdsMock,
  restoreEventRsvpSnapshots: restoreEventRsvpSnapshotsMock,
}));

describe('buildItineraryTemplateInsertRows', () => {
  beforeEach(() => {
    getUserMock.mockReset();
    fromMock.mockReset();
    resolveActiveSiteForUserMock.mockReset();
    getEventRsvpSnapshotsByInvitationIdsMock.mockReset();
    deleteEventRsvpByInvitationIdMock.mockReset();
    deleteEventRsvpsByInvitationIdsMock.mockReset();
    restoreEventRsvpSnapshotsMock.mockReset();
  });

  it('scopes template event inserts to one site and preserves public schedule fields', () => {
    expect(buildItineraryTemplateInsertRows('site-1', [
      {
        event_name: 'Ceremony',
        description: 'Guests gather for vows.',
        event_date: '2026-06-20',
        start_time: '16:00',
        end_time: '16:30',
        display_order: 2,
      },
    ])).toEqual([
      {
        wedding_site_id: 'site-1',
        event_name: 'Ceremony',
        title: 'Ceremony',
        description: 'Guests gather for vows.',
        event_date: '2026-06-20',
        start_time: '16:00',
        end_time: '16:30',
        display_order: 2,
        is_visible: true,
      },
    ]);
  });

  it('builds schedule-section mirror rows from visible itinerary events', () => {
    expect(buildScheduleSectionEvents([
      {
        id: 'evt-1',
        event_name: 'Reception',
        description: 'Dinner and dancing.',
        event_date: '2026-06-20',
        start_time: '18:00',
        end_time: '22:00',
        location_name: 'Grand Hall',
        location_address: '123 Celebration Ave',
        notes: 'Bring dancing shoes.',
        is_visible: true,
      },
      {
        id: 'evt-2',
        event_name: 'Private',
        description: '',
        event_date: '2026-06-20',
        start_time: '09:00',
        end_time: null,
        location_name: '',
        location_address: '',
        notes: null,
        is_visible: false,
      },
    ])).toEqual([
      {
        id: 'evt-1',
        title: 'Reception',
        time: '18:00 - 22:00',
        description: 'Dinner and dancing.',
        location: 'Grand Hall · 123 Celebration Ave',
      },
    ]);
  });

  it('builds wedding schedule mirror rows from visible itinerary events', () => {
    expect(buildWeddingSchedule([
      {
        id: 'evt-1',
        event_name: 'Ceremony',
        description: 'Guests gather for vows.',
        event_date: '2026-06-20',
        start_time: '16:00',
        end_time: '16:30',
        location_name: 'Rose Garden',
        location_address: '10 Sunset Way',
        notes: 'Arrive 15 minutes early.',
        is_visible: true,
      },
      {
        id: 'evt-2',
        event_name: 'Hidden',
        description: '',
        event_date: '2026-06-20',
        start_time: '09:00',
        end_time: null,
        location_name: '',
        location_address: '',
        notes: null,
        is_visible: false,
      },
    ])).toEqual([
      {
        id: 'evt-1',
        label: 'Ceremony',
        startTimeISO: combineDateAndTimeISO('2026-06-20', '16:00'),
        endTimeISO: combineDateAndTimeISO('2026-06-20', '16:30'),
        notes: 'Rose Garden · 10 Sunset Way — Guests gather for vows. · Arrive 15 minutes early.',
      },
    ]);
  });

  it('resolves the active itinerary site id through the service helper', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    resolveActiveSiteForUserMock.mockResolvedValue({ id: 'site-1', role: 'owner', permissions: null });

    await expect(resolveItinerarySiteId()).resolves.toBe('site-1');
  });

  it('loads itinerary event guest manager data through the service', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    resolveActiveSiteForUserMock.mockResolvedValue({ id: 'site-1', role: 'owner', permissions: null });

    fromMock
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'site-1' }, error: null }),
          })),
        })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({
                data: [{ id: 'guest-1', name: 'Alex Jordan', first_name: 'Alex', last_name: 'Jordan', email: 'alex@example.com' }],
                error: null,
              }),
            })),
          })),
        })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({
              data: [{ guest_id: 'guest-1' }],
              error: null,
            }),
          })),
        })),
      });

    await expect(loadItineraryEventGuestManagerSnapshot('event-1')).resolves.toEqual({
      guests: [{ id: 'guest-1', name: 'Alex Jordan', first_name: 'Alex', last_name: 'Jordan', email: 'alex@example.com' }],
      invitedGuestIds: new Set(['guest-1']),
    });
  });

  it('keeps itinerary guest picker queries bounded in the service', () => {
    expect(ITINERARY_EVENT_GUEST_PICKER_SELECT).toBe('id, name, first_name, last_name, email');
    expect(MAX_ITINERARY_EVENT_GUESTS).toBe(5000);
    expect(MAX_ITINERARY_EVENT_INVITATIONS).toBe(10000);
  });

  it('adds an itinerary event guest invitation through the service', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockReturnValueOnce({
      upsert: upsertMock,
    });

    await expect(addItineraryEventGuestInvitation('event-1', 'guest-1')).resolves.toBeUndefined();
  });

  it('removes an itinerary event guest invitation through the service', async () => {
    fromMock
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'invite-1' }, error: null }),
            })),
          })),
        })),
      })
      .mockReturnValueOnce({
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        })),
      });
    getEventRsvpSnapshotsByInvitationIdsMock.mockResolvedValue([]);
    deleteEventRsvpByInvitationIdMock.mockResolvedValue(undefined);

    await expect(removeItineraryEventGuestInvitation('event-1', 'guest-1')).resolves.toBeUndefined();
  });

  it('invites all guests to an itinerary event through the service', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockReturnValueOnce({
      upsert: upsertMock,
    });

    await expect(inviteAllGuestsToItineraryEvent('event-1', ['guest-1', 'guest-2'])).resolves.toBeUndefined();
  });

  it('removes all guests from an itinerary event through the service', async () => {
    fromMock
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: [{ id: 'invite-1' }], error: null }),
        })),
      })
      .mockReturnValueOnce({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });
    getEventRsvpSnapshotsByInvitationIdsMock.mockResolvedValue([]);
    deleteEventRsvpsByInvitationIdsMock.mockResolvedValue(undefined);

    await expect(removeAllGuestsFromItineraryEvent('event-1')).resolves.toBeUndefined();
  });
});
