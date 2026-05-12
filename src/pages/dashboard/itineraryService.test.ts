import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addItineraryEventGuestInvitation,
  buildItineraryTemplateInsertRows,
  buildScheduleSectionEvents,
  deleteItineraryEvent,
  inviteAllGuestsToItineraryEvent,
  ITINERARY_EVENT_SELECT,
  ITINERARY_EVENT_GUEST_PICKER_SELECT,
  loadItineraryDashboardEvents,
  loadItineraryEventGuestManagerSnapshot,
  MAX_ITINERARY_EVENTS,
  MAX_ITINERARY_EVENT_GUESTS,
  MAX_ITINERARY_EVENT_INVITATIONS,
  persistItineraryTimeline,
  removeAllGuestsFromItineraryEvent,
  removeItineraryEventGuestInvitation,
  resolveItinerarySiteId,
  saveItineraryEvent,
  buildWeddingSchedule,
} from './itineraryService';
import { combineDateAndTimeISO } from './itineraryDateTime';

const {
  getUserMock,
  fromMock,
  rpcMock,
  resolveActiveSiteForUserMock,
  getEventRsvpSnapshotsByInvitationIdsMock,
  deleteEventRsvpByInvitationIdMock,
  deleteEventRsvpsByInvitationIdsMock,
  restoreEventRsvpSnapshotsMock,
  invokeFunctionOrThrowMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
  resolveActiveSiteForUserMock: vi.fn(),
  getEventRsvpSnapshotsByInvitationIdsMock: vi.fn(),
  deleteEventRsvpByInvitationIdMock: vi.fn(),
  deleteEventRsvpsByInvitationIdsMock: vi.fn(),
  restoreEventRsvpSnapshotsMock: vi.fn(),
  invokeFunctionOrThrowMock: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: getUserMock,
    },
    from: fromMock,
    rpc: rpcMock,
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

vi.mock('../../lib/invokeFunctionOrThrow', () => ({
  invokeFunctionOrThrow: invokeFunctionOrThrowMock,
}));

describe('buildItineraryTemplateInsertRows', () => {
  beforeEach(() => {
    getUserMock.mockReset();
    fromMock.mockReset();
    rpcMock.mockReset();
    resolveActiveSiteForUserMock.mockReset();
    getEventRsvpSnapshotsByInvitationIdsMock.mockReset();
    deleteEventRsvpByInvitationIdMock.mockReset();
    deleteEventRsvpsByInvitationIdsMock.mockReset();
    restoreEventRsvpSnapshotsMock.mockReset();
    invokeFunctionOrThrowMock.mockReset();
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
    expect(ITINERARY_EVENT_SELECT).toBe('id, event_name, title, description, event_date, start_time, end_time, location_name, location_address, dress_code, notes, display_order, sort_order, is_visible');
    expect(MAX_ITINERARY_EVENTS).toBe(200);
    expect(ITINERARY_EVENT_GUEST_PICKER_SELECT).toBe('id, name, first_name, last_name, email');
    expect(MAX_ITINERARY_EVENT_GUESTS).toBe(5000);
    expect(MAX_ITINERARY_EVENT_INVITATIONS).toBe(10000);
  });

  it('loads itinerary dashboard events through the service', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    resolveActiveSiteForUserMock.mockResolvedValue({ id: 'site-1', role: 'owner', permissions: null });

    const sectionUpdateEqMock = vi.fn().mockResolvedValue({ error: null });
    fromMock
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'site-1' }, error: null }),
          })),
        })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({
                  data: [{
                    id: 'event-1',
                    event_name: 'Ceremony',
                    description: 'Guests gather',
                    event_date: '2026-06-20',
                    start_time: '16:00',
                    end_time: '16:30',
                    location_name: 'Rose Garden',
                    location_address: '10 Sunset Way',
                    dress_code: null,
                    notes: null,
                    display_order: 1,
                    is_visible: true,
                  }],
                  error: null,
                }),
              })),
            })),
          })),
        })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: { wedding_data: {} }, error: null }),
          })),
        })),
      })
      .mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: [{ id: 'section-1', data: {} }], error: null }),
          })),
        })),
      })
      .mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: sectionUpdateEqMock,
        })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [{ id: 'invite-1' }], error: null }),
          })),
        })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          in: vi.fn().mockResolvedValue({ data: [{ attending: true }], error: null }),
        })),
      });

    await expect(loadItineraryDashboardEvents(null)).resolves.toEqual({
      events: [{
        id: 'event-1',
        event_name: 'Ceremony',
        description: 'Guests gather',
        event_date: '2026-06-20',
        start_time: '16:00',
        end_time: '16:30',
        location_name: 'Rose Garden',
        location_address: '10 Sunset Way',
        dress_code: null,
        notes: null,
        display_order: 1,
        is_visible: true,
        invitation_count: 1,
        rsvp_count: 1,
        attending_count: 1,
        declined_count: 0,
        pending_count: 0,
      }],
      hasEventRsvpsTable: true,
    });
  });

  it('persists itinerary timeline shifts through the service and refreshes the mirror', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    resolveActiveSiteForUserMock.mockResolvedValue({ id: 'site-1', role: 'owner', permissions: null });

    const firstUpdateEqMock = vi.fn().mockResolvedValue({ error: null });
    const secondUpdateEqMock = vi.fn().mockResolvedValue({ error: null });
    const sectionUpdateEqMock = vi.fn().mockResolvedValue({ error: null });
    fromMock
      .mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: firstUpdateEqMock,
        })),
      })
      .mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: secondUpdateEqMock,
        })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: { wedding_data: {} }, error: null }),
          })),
        })),
      })
      .mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: [{ id: 'section-1', data: {} }], error: null }),
          })),
        })),
      })
      .mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: sectionUpdateEqMock,
        })),
      });

    await expect(persistItineraryTimeline([
      {
        id: 'event-1',
        event_name: 'Ceremony',
        description: 'Guests gather',
        event_date: '2026-06-20',
        start_time: '16:15',
        end_time: '16:45',
        location_name: 'Rose Garden',
        location_address: '10 Sunset Way',
        dress_code: null,
        notes: null,
        display_order: 1,
        is_visible: true,
      },
      {
        id: 'event-2',
        event_name: 'Reception',
        description: '',
        event_date: '2026-06-20',
        start_time: '18:15',
        end_time: '22:15',
        location_name: 'Grand Hall',
        location_address: '',
        dress_code: null,
        notes: null,
        display_order: 2,
        is_visible: true,
      },
    ])).resolves.toBe('site-1');

    expect(firstUpdateEqMock).toHaveBeenCalledWith('id', 'event-1');
    expect(secondUpdateEqMock).toHaveBeenCalledWith('id', 'event-2');
    expect(sectionUpdateEqMock).toHaveBeenCalledWith('id', 'section-1');
  });

  it('saves a new itinerary event through the service and triggers best-effort album creation', async () => {
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
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'event-1', event_name: 'Ceremony' }, error: null }),
          })),
        })),
      });
    invokeFunctionOrThrowMock.mockResolvedValue({ data: null, error: null });

    await expect(saveItineraryEvent({
      editingEventId: null,
      autoCreateAlbum: true,
      formData: {
        event_name: 'Ceremony',
        description: 'Guests gather',
        event_date: '2026-06-20',
        start_time: '16:00',
        end_time: '16:30',
        location_name: 'Rose Garden',
        location_address: '10 Sunset Way',
        dress_code: 'Cocktail',
        notes: 'Arrive early',
        is_visible: true,
      },
    })).resolves.toBeUndefined();

    expect(invokeFunctionOrThrowMock).toHaveBeenCalledWith(expect.anything(), 'photo-album-create', {
      siteId: 'site-1',
      name: 'Ceremony',
      itineraryEventId: 'event-1',
    });
  });

  it('updates an existing itinerary event through the service', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    resolveActiveSiteForUserMock.mockResolvedValue({ id: 'site-1', role: 'owner', permissions: null });

    const updateMock = vi.fn().mockResolvedValue({ error: null });
    fromMock
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'site-1' }, error: null }),
          })),
        })),
      })
      .mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: updateMock,
        })),
      });

    await expect(saveItineraryEvent({
      editingEventId: 'event-1',
      autoCreateAlbum: false,
      formData: {
        event_name: 'Reception',
        description: '',
        event_date: '2026-06-20',
        start_time: '18:00',
        end_time: '22:00',
        location_name: 'Grand Hall',
        location_address: '',
        dress_code: '',
        notes: '',
        is_visible: true,
      },
    })).resolves.toBeUndefined();

    expect(updateMock).toHaveBeenCalledWith('id', 'event-1');
    expect(invokeFunctionOrThrowMock).not.toHaveBeenCalled();
  });

  it('adds an itinerary event guest invitation through the service', async () => {
    rpcMock.mockResolvedValueOnce({ error: null });

    await expect(addItineraryEventGuestInvitation('event-1', 'guest-1')).resolves.toBeUndefined();
    expect(rpcMock).toHaveBeenCalledWith('guest_dashboard_event_invitation_insert_many', {
      p_rows: [{ event_id: 'event-1', guest_id: 'guest-1' }],
    });
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
      });
    rpcMock.mockResolvedValueOnce({ error: null });
    getEventRsvpSnapshotsByInvitationIdsMock.mockResolvedValue([]);
    deleteEventRsvpByInvitationIdMock.mockResolvedValue(undefined);

    await expect(removeItineraryEventGuestInvitation('event-1', 'guest-1')).resolves.toBeUndefined();
    expect(rpcMock).toHaveBeenCalledWith('guest_dashboard_event_invitation_delete', {
      p_guest_id: 'guest-1',
      p_event_id: 'event-1',
      p_guest_ids: null,
    });
  });

  it('invites all guests to an itinerary event through the service', async () => {
    rpcMock.mockResolvedValueOnce({ error: null });

    await expect(inviteAllGuestsToItineraryEvent('event-1', ['guest-1', 'guest-2'])).resolves.toBeUndefined();
    expect(rpcMock).toHaveBeenCalledWith('guest_dashboard_event_invitation_insert_many', {
      p_rows: [
        { event_id: 'event-1', guest_id: 'guest-1' },
        { event_id: 'event-1', guest_id: 'guest-2' },
      ],
    });
  });

  it('removes all guests from an itinerary event through the service', async () => {
    fromMock
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: [{ id: 'invite-1' }], error: null }),
        })),
      });
    rpcMock.mockResolvedValueOnce({ error: null });
    getEventRsvpSnapshotsByInvitationIdsMock.mockResolvedValue([]);
    deleteEventRsvpsByInvitationIdsMock.mockResolvedValue(undefined);

    await expect(removeAllGuestsFromItineraryEvent('event-1')).resolves.toBeUndefined();
    expect(rpcMock).toHaveBeenCalledWith('guest_dashboard_event_invitation_delete', {
      p_guest_id: null,
      p_event_id: 'event-1',
      p_guest_ids: null,
    });
  });

  it('deletes an itinerary event through the service', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockReturnValueOnce({
      delete: vi.fn(() => ({
        eq: eqMock,
      })),
    });

    await expect(deleteItineraryEvent('event-1')).resolves.toBeUndefined();
    expect(eqMock).toHaveBeenCalledWith('id', 'event-1');
  });
});
