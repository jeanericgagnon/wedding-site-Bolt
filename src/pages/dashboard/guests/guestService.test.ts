import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GUEST_CONFLICT_SELECT,
  GUEST_DASHBOARD_RSVP_SELECT,
  GUEST_SITE_SETTINGS_SELECT,
  MAX_GUEST_BULK_INVITATION_ROWS,
  MAX_GUEST_BULK_OPERATION_IDS,
  MAX_GUEST_DASHBOARD_ROWS,
  MAX_GUEST_RSVP_CONFLICT_HISTORY_ROWS,
  MAX_GUEST_RSVP_CONFLICT_ROWS,
  MAX_GUEST_RSVP_LOOKUP_IDS,
  loadGuestDashboardSiteSettings,
  loadGuestDashboardSnapshot,
  refreshGuestDashboardSession,
  toEventInvitationRows,
} from './guestService';

const { refreshSessionMock, fromMock, resolveActiveSiteForUserMock } = vi.hoisted(() => ({
  refreshSessionMock: vi.fn(),
  fromMock: vi.fn(),
  resolveActiveSiteForUserMock: vi.fn(),
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

describe('guestService', () => {
  beforeEach(() => {
    refreshSessionMock.mockReset();
    fromMock.mockReset();
    resolveActiveSiteForUserMock.mockReset();
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
    expect(page).not.toContain("supabase.rpc('generate_secure_token'");
    expect(page).not.toContain('supabase.auth.refreshSession()');
    expect(page).not.toContain(".from('wedding_sites')\n        .select('id, couple_name_1, couple_name_2");
    expect(page).not.toContain(".from('guests')\n        .select('id, first_name, last_name");
    expect(service).toContain("supabase.rpc('generate_secure_token'");
    expect(service).toContain('export async function generateSecureGuestInviteToken()');
    expect(service).toContain('export async function refreshGuestDashboardSession(): Promise<void>');
    expect(service).toContain('export async function loadGuestDashboardSiteSettings(userId: string)');
    expect(service).toContain('export async function loadGuestDashboardSnapshot(weddingSiteId: string)');
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
});
