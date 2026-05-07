import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addGuestEventInvitation,
  GUEST_AUDIT_SELECT,
  GUEST_CONFLICT_SELECT,
  GUEST_DASHBOARD_RSVP_SELECT,
  GUEST_EVENT_INVITATION_SELECT,
  GUEST_ITINERARY_EVENT_SELECT,
  GUEST_ITINERARY_SITE_SELECT,
  GUEST_SITE_SETTINGS_SELECT,
  loadGuestItineraryDrawerSnapshot,
  MAX_GUEST_BULK_INVITATION_ROWS,
  MAX_GUEST_BULK_OPERATION_IDS,
  MAX_GUEST_AUDIT_ROWS,
  MAX_GUEST_DASHBOARD_ROWS,
  MAX_GUEST_DRAWER_AUDIT_ROWS,
  MAX_GUEST_DRAWER_EVENTS,
  MAX_GUEST_DRAWER_INVITATIONS,
  MAX_GUEST_ITINERARY_FILTER_EVENTS,
  MAX_GUEST_ITINERARY_FILTER_INVITATIONS,
  MAX_GUEST_RSVP_CONFLICT_HISTORY_ROWS,
  MAX_GUEST_RSVP_CONFLICT_ROWS,
  MAX_GUEST_RSVP_LOOKUP_IDS,
  loadGuestDashboardItineraryFilters,
  loadGuestDashboardRsvpAuditFeed,
  loadGuestDashboardSiteSettings,
  loadGuestDashboardSnapshot,
  removeGuestEventInvitation,
  refreshGuestDashboardSession,
  toEventInvitationRows,
} from './guestService';

const {
  refreshSessionMock,
  fromMock,
  resolveActiveSiteForUserMock,
  getEventRsvpSnapshotsByInvitationIdsMock,
  deleteEventRsvpByInvitationIdMock,
  restoreEventRsvpSnapshotsMock,
} = vi.hoisted(() => ({
  refreshSessionMock: vi.fn(),
  fromMock: vi.fn(),
  resolveActiveSiteForUserMock: vi.fn(),
  getEventRsvpSnapshotsByInvitationIdsMock: vi.fn(),
  deleteEventRsvpByInvitationIdMock: vi.fn(),
  restoreEventRsvpSnapshotsMock: vi.fn(),
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      refreshSession: refreshSessionMock,
    },
    from: fromMock,
  },
}));

vi.mock('../../../lib/activeSite', () => ({
  resolveActiveSiteForUser: resolveActiveSiteForUserMock,
}));

vi.mock('../../../lib/eventRsvpCleanup', () => ({
  getEventRsvpSnapshotsByInvitationIds: getEventRsvpSnapshotsByInvitationIdsMock,
  deleteEventRsvpByInvitationIds: vi.fn(),
  restoreEventRsvpSnapshots: restoreEventRsvpSnapshotsMock,
  deleteEventRsvpByInvitationId: deleteEventRsvpByInvitationIdMock,
}));

describe('guestService', () => {
  beforeEach(() => {
    refreshSessionMock.mockReset();
    fromMock.mockReset();
    resolveActiveSiteForUserMock.mockReset();
    getEventRsvpSnapshotsByInvitationIdsMock.mockReset();
    deleteEventRsvpByInvitationIdMock.mockReset();
    restoreEventRsvpSnapshotsMock.mockReset();
  });

  it('keeps guest RSVP reads explicitly projected', () => {
    expect(GUEST_DASHBOARD_RSVP_SELECT).toContain('guest_id');
    expect(GUEST_DASHBOARD_RSVP_SELECT).toContain('custom_answers');
    expect(GUEST_SITE_SETTINGS_SELECT).toContain('rsvp_custom_questions');
    expect(GUEST_CONFLICT_SELECT).toContain('conflict_code');
    expect(MAX_GUEST_DASHBOARD_ROWS).toBe(5000);
    expect(GUEST_DASHBOARD_RSVP_SELECT).not.toContain('*');
    expect(MAX_GUEST_RSVP_LOOKUP_IDS).toBe(5000);
    expect(MAX_GUEST_BULK_OPERATION_IDS).toBe(5000);
    expect(MAX_GUEST_BULK_INVITATION_ROWS).toBe(10000);
    expect(MAX_GUEST_RSVP_CONFLICT_ROWS).toBe(20);
    expect(MAX_GUEST_RSVP_CONFLICT_HISTORY_ROWS).toBe(500);
    expect(GUEST_ITINERARY_EVENT_SELECT).toContain('event_name');
    expect(GUEST_ITINERARY_SITE_SELECT).toBe('wedding_data');
    expect(GUEST_EVENT_INVITATION_SELECT).toBe('event_id, guest_id');
    expect(GUEST_AUDIT_SELECT).toContain('changed_at');
    expect(MAX_GUEST_ITINERARY_FILTER_EVENTS).toBe(200);
    expect(MAX_GUEST_ITINERARY_FILTER_INVITATIONS).toBe(10000);
    expect(MAX_GUEST_AUDIT_ROWS).toBe(20);
    expect(MAX_GUEST_DRAWER_EVENTS).toBe(200);
    expect(MAX_GUEST_DRAWER_INVITATIONS).toBe(10000);
    expect(MAX_GUEST_DRAWER_AUDIT_ROWS).toBe(12);
  });

  it('builds scoped event invitation rows for one guest', () => {
    expect(toEventInvitationRows('guest-1', ['event-a', 'event-b'])).toEqual([
      { guest_id: 'guest-1', event_id: 'event-a' },
      { guest_id: 'guest-1', event_id: 'event-b' },
    ]);
  });

  it('keeps guest invite token generation behind the guest service', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/dashboard/Guests.tsx'), 'utf8');
    const service = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/guestService.ts'), 'utf8');

    expect(page).toContain('generateSecureGuestInviteToken()');
    expect(page).toContain('refreshGuestDashboardSession()');
    expect(page).toContain('loadGuestDashboardSiteSettings(user.id)');
    expect(page).toContain('loadGuestDashboardSnapshot(weddingSiteId)');
    expect(page).toContain('loadGuestDashboardItineraryFilters(weddingSiteId)');
    expect(page).toContain('loadGuestDashboardRsvpAuditFeed(weddingSiteId)');
    expect(page).toContain('loadGuestItineraryDrawerSnapshot(weddingSiteId, guest.id)');
    expect(page).toContain('removeGuestEventInvitation(eventId, itineraryDrawerGuest.id)');
    expect(page).toContain('addGuestEventInvitation(eventId, itineraryDrawerGuest.id)');
    expect(page).not.toContain("supabase.rpc('generate_secure_token'");
    expect(page).not.toContain('supabase.auth.refreshSession()');
    expect(page).not.toContain(".from('wedding_sites')\n        .select('id, couple_name_1, couple_name_2");
    expect(page).not.toContain(".from('guests')\n        .select('id, first_name, last_name");
    expect(page).not.toContain(".from('itinerary_events')\n            .select('id, event_name, event_date, start_time, location_name')");
    expect(page).not.toContain(".from('guest_audit_logs')\n          .select('id, guest_id, action, changed_at, changed_by, old_data, new_data')");
    expect(page).not.toContain(".from('event_invitations')\n          .select('id')");
    expect(page).not.toContain(".from('event_invitations')\n          .delete()");
    expect(page).not.toContain(".from('event_invitations')\n          .insert({ event_id: eventId, guest_id: itineraryDrawerGuest.id })");
    expect(service).toContain("supabase.rpc('generate_secure_token'");
    expect(service).toContain('export async function generateSecureGuestInviteToken()');
    expect(service).toContain('export async function refreshGuestDashboardSession(): Promise<void>');
    expect(service).toContain('export async function loadGuestDashboardSiteSettings(userId: string)');
    expect(service).toContain('export async function loadGuestDashboardSnapshot(weddingSiteId: string)');
    expect(service).toContain('export async function loadGuestDashboardItineraryFilters(weddingSiteId: string)');
    expect(service).toContain('export async function loadGuestDashboardRsvpAuditFeed(weddingSiteId: string)');
    expect(service).toContain('export async function loadGuestItineraryDrawerSnapshot(weddingSiteId: string, guestId: string)');
    expect(service).toContain('export async function addGuestEventInvitation(eventId: string, guestId: string): Promise<void>');
    expect(service).toContain('export async function removeGuestEventInvitation(eventId: string, guestId: string): Promise<void>');
    expect(service).toContain('supabase.auth.refreshSession()');
  });

  it('refreshes the guest dashboard session through the service', async () => {
    refreshSessionMock.mockResolvedValueOnce({ data: { session: { access_token: 'token' } } });
    await expect(refreshGuestDashboardSession()).resolves.toBeUndefined();
  });

  it('keeps guest RSVP lookup fan-out bounded', () => {
    const service = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/guestService.ts'), 'utf8');

    expect(service).toContain('MAX_GUEST_RSVP_LOOKUP_IDS = 5000');
    expect(service).toContain('const scopedGuestIds = guestIds.slice(0, MAX_GUEST_RSVP_LOOKUP_IDS);');
    expect(service).toContain(".in('guest_id', scopedGuestIds);");
  });

  it('keeps guest bulk-operation fan-out bounded', () => {
    const service = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/guestService.ts'), 'utf8');

    expect(service).toContain('MAX_GUEST_BULK_OPERATION_IDS = 5000');
    expect(service).toContain('MAX_GUEST_BULK_INVITATION_ROWS = 10000');
    expect(service).toContain('const scopedGuestIds = guestIds.slice(0, MAX_GUEST_BULK_OPERATION_IDS);');
    expect(service).toContain(".in('guest_id', scopedGuestIds);");
    expect(service).toContain(".limit(MAX_GUEST_BULK_INVITATION_ROWS);");
    expect(service).toContain(".in('id', scopedGuestIds);");
    expect(service).toContain("Array.from(new Set(rows.map((row) => row.guest_id))).slice(0, MAX_GUEST_BULK_OPERATION_IDS);");
  });

  it('loads guest dashboard site settings through the service', async () => {
    resolveActiveSiteForUserMock.mockResolvedValueOnce({
      id: 'site-1',
      role: 'planner',
      permissions: ['guests'],
    });
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: {
        id: 'site-1',
        couple_name_1: 'Alex',
        couple_name_2: 'Jordan',
        wedding_date: '2026-06-01',
        venue_name: 'Venue',
        venue_address: '123 Main',
        site_url: 'https://dayof.love/alex-jordan',
        site_slug: 'alex-jordan',
        rsvp_custom_questions: [{ id: 'q1', label: 'Song?', type: 'short_text', required: false, appliesTo: 'all' }],
        rsvp_meal_config: { enabled: true, options: ['Chicken', 'Fish'] },
        reminder_cadence_days: 3,
        auto_reminders_enabled: true,
      },
      error: null,
    });
    const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    fromMock.mockReturnValue({ select: selectMock });

    await expect(loadGuestDashboardSiteSettings('user-1')).resolves.toEqual(expect.objectContaining({
      activeSiteId: 'site-1',
      role: 'planner',
      permissions: ['guests'],
      mealEnabled: true,
      mealOptions: ['Chicken', 'Fish'],
      reminderCadenceDays: 3,
      autoRemindersEnabled: true,
      siteInfo: expect.objectContaining({ id: 'site-1', site_slug: 'alex-jordan' }),
      questions: [expect.objectContaining({ id: 'q1', label: 'Song?' })],
    }));
    expect(resolveActiveSiteForUserMock).toHaveBeenCalledWith('user-1');
  });

  it('loads guest dashboard snapshot through the service', async () => {
    const guestsQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({
              data: [{ id: 'guest-1', name: 'Alex Jordan' }],
              error: null,
            }),
          })),
        })),
      })),
    };
    const rsvpsQuery = {
      select: vi.fn(() => ({
        in: vi.fn().mockResolvedValue({
          data: [{ guest_id: 'guest-1', attending: true }],
          error: null,
        }),
      })),
    };
    const conflictOpenLimit = vi.fn().mockResolvedValue({
      data: [{ id: 'conflict-1', guest_id: 'guest-1', conflict_code: 'missing_meal', message: 'Meal missing', severity: 'warning', created_at: '2026-05-07T00:00:00Z', resolved: false }],
      error: null,
    });
    const conflictHistoryLimit = vi.fn().mockResolvedValue({
      data: [{ id: 'conflict-2', guest_id: 'guest-1', conflict_code: 'late_rsvp', message: 'Late RSVP', severity: 'error', created_at: '2026-05-06T00:00:00Z', resolved: true, resolved_at: '2026-05-07T00:00:00Z' }],
      error: null,
    });
    const conflictsQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({ limit: conflictOpenLimit })),
          })),
          gte: vi.fn(() => ({
            order: vi.fn(() => ({ limit: conflictHistoryLimit })),
          })),
        })),
      })),
    };
    fromMock
      .mockReturnValueOnce(guestsQuery)
      .mockReturnValueOnce(rsvpsQuery)
      .mockReturnValueOnce(conflictsQuery)
      .mockReturnValueOnce(conflictsQuery);

    await expect(loadGuestDashboardSnapshot('site-1')).resolves.toEqual({
      guests: [{ id: 'guest-1', name: 'Alex Jordan', rsvp: { guest_id: 'guest-1', attending: true } }],
      conflicts: [{ id: 'conflict-1', guest_id: 'guest-1', conflict_code: 'missing_meal', message: 'Meal missing', severity: 'warning', created_at: '2026-05-07T00:00:00Z', resolved: false }],
      conflictHistory: [{ id: 'conflict-2', guest_id: 'guest-1', conflict_code: 'late_rsvp', message: 'Late RSVP', severity: 'error', created_at: '2026-05-06T00:00:00Z', resolved: true, resolved_at: '2026-05-07T00:00:00Z' }],
    });
  });

  it('loads guest dashboard itinerary filters through the service', async () => {
    const itineraryQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({
              data: [{ id: 'event-1', event_name: 'Ceremony', event_date: '2026-06-01', start_time: '16:00', location_name: 'Garden' }],
              error: null,
            }),
          })),
        })),
      })),
    };
    const siteQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { wedding_data: { meta: { rsvpEventSeeds: [{ id: 'seed-1', label: 'Ceremony' }] } } },
            error: null,
          }),
        })),
      })),
    };
    const invitesQuery = {
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({
            data: [{ event_id: 'event-1', guest_id: 'guest-1' }],
            error: null,
          }),
        })),
      })),
    };
    fromMock
      .mockReturnValueOnce(itineraryQuery)
      .mockReturnValueOnce(siteQuery)
      .mockReturnValueOnce(invitesQuery);

    await expect(loadGuestDashboardItineraryFilters('site-1')).resolves.toEqual({
      itineraryEvents: [{ id: 'event-1', event_name: 'Ceremony', event_date: '2026-06-01', start_time: '16:00', location_name: 'Garden' }],
      filterEvents: [{ id: 'event-1', event_name: 'Ceremony', event_date: '2026-06-01', start_time: '16:00', location_name: 'Garden' }],
      eventInviteGuestMap: new Map([['event-1', new Set(['guest-1'])]]),
    });
  });

  it('loads guest dashboard RSVP audit feed through the service', async () => {
    const auditQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({
              data: [{
                id: 'audit-1',
                guest_id: 'guest-1',
                action: 'update',
                changed_at: '2026-05-07T00:00:00Z',
                changed_by: 'owner-1',
                old_data: { rsvp_status: 'pending' },
                new_data: { rsvp_status: 'confirmed' },
              }],
              error: null,
            }),
          })),
        })),
      })),
    };
    fromMock.mockReturnValueOnce(auditQuery);

    await expect(loadGuestDashboardRsvpAuditFeed('site-1')).resolves.toEqual([{
      id: 'audit-1',
      guest_id: 'guest-1',
      action: 'update',
      changed_at: '2026-05-07T00:00:00Z',
      changed_by: 'owner-1',
      old_data: { rsvp_status: 'pending' },
      new_data: { rsvp_status: 'confirmed' },
    }]);
  });

  it('loads guest itinerary drawer data through the service', async () => {
    const eventsQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({
              data: [{ id: 'event-1', event_name: 'Ceremony', event_date: '2026-06-01', start_time: '16:00', location_name: 'Garden' }],
              error: null,
            }),
          })),
        })),
      })),
    };
    const invitesQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({
            data: [{ event_id: 'event-1' }],
            error: null,
          }),
        })),
      })),
    };
    const auditQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({
              data: [{
                id: 'audit-1',
                action: 'update',
                changed_at: '2026-05-07T00:00:00Z',
                changed_by: 'owner-1',
                old_data: { rsvp_status: 'pending' },
                new_data: { rsvp_status: 'confirmed' },
              }],
              error: null,
            }),
          })),
        })),
      })),
    };
    fromMock
      .mockReturnValueOnce(eventsQuery)
      .mockReturnValueOnce(invitesQuery)
      .mockReturnValueOnce(auditQuery);

    await expect(loadGuestItineraryDrawerSnapshot('site-1', 'guest-1')).resolves.toEqual({
      events: [{ id: 'event-1', event_name: 'Ceremony', event_date: '2026-06-01', start_time: '16:00', location_name: 'Garden' }],
      guestEventIds: new Set(['event-1']),
      auditEntries: [{
        id: 'audit-1',
        action: 'update',
        changed_at: '2026-05-07T00:00:00Z',
        changed_by: 'owner-1',
        old_data: { rsvp_status: 'pending' },
        new_data: { rsvp_status: 'confirmed' },
      }],
    });
  });

  it('inserts a guest event invitation through the service', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockReturnValueOnce({ insert: insertMock });

    await expect(addGuestEventInvitation('event-1', 'guest-1')).resolves.toBeUndefined();
    expect(insertMock).toHaveBeenCalledWith({ event_id: 'event-1', guest_id: 'guest-1' });
  });

  it('removes a guest event invitation through the service', async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: { id: 'invite-1' }, error: null });
    const deleteEqGuestMock = vi.fn().mockResolvedValue({ error: null });
    const deleteEqEventMock = vi.fn(() => ({ eq: deleteEqGuestMock }));

    fromMock
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: maybeSingleMock })),
          })),
        })),
      })
      .mockReturnValueOnce({
        delete: vi.fn(() => ({
          eq: deleteEqEventMock,
        })),
      });

    await expect(removeGuestEventInvitation('event-1', 'guest-1')).resolves.toBeUndefined();
    expect(deleteEqEventMock).toHaveBeenCalledWith('event_id', 'event-1');
    expect(deleteEqGuestMock).toHaveBeenCalledWith('guest_id', 'guest-1');
  });
});
