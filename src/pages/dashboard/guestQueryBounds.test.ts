import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('guest query bounds', () => {
  it('caps guest dashboard and itinerary helper reads', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/dashboard/Guests.tsx'), 'utf8');
    const service = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/guestService.ts'), 'utf8');

    expect(service).toContain('export const MAX_GUEST_DASHBOARD_ROWS = 5000;');
    expect(page).toContain('export const MAX_GUEST_ITINERARY_FILTER_EVENTS = 200;');
    expect(page).toContain('export const MAX_GUEST_ITINERARY_FILTER_INVITATIONS = 10000;');
    expect(page).toContain('export const MAX_GUEST_DRAWER_EVENTS = 200;');
    expect(page).toContain('export const MAX_GUEST_DRAWER_INVITATIONS = 10000;');
    expect(page).toContain('export const MAX_GUEST_DRAWER_AUDIT_ROWS = 12;');
    expect(service).toContain('export const MAX_GUEST_RSVP_CONFLICT_ROWS = 20;');
    expect(service).toContain('export const MAX_GUEST_RSVP_CONFLICT_HISTORY_ROWS = 500;');
    expect(page).toContain('export const MAX_GUEST_AUDIT_ROWS = 20;');
    expect(service).toContain(".order('created_at', { ascending: false })\n    .limit(MAX_GUEST_DASHBOARD_ROWS);");
    expect(page).toContain(".order('event_date', { ascending: true })\n            .limit(MAX_GUEST_ITINERARY_FILTER_EVENTS),");
    expect(page).toContain(".in('event_id', eventIds)\n              .limit(MAX_GUEST_ITINERARY_FILTER_INVITATIONS)");
    expect(page).toContain(".order('event_date', { ascending: true })\n          .limit(MAX_GUEST_DRAWER_EVENTS),");
    expect(page).toContain(".eq('guest_id', guest.id)\n          .limit(MAX_GUEST_DRAWER_INVITATIONS),");
    expect(page).toContain(".eq('guest_id', guest.id)\n              .order('changed_at', { ascending: false })\n              .limit(MAX_GUEST_DRAWER_AUDIT_ROWS),");
    expect(service).toContain(".eq('resolved', false)\n      .order('created_at', { ascending: false })\n      .limit(MAX_GUEST_RSVP_CONFLICT_ROWS),");
    expect(service).toContain(".gte('created_at', windowStartIso)\n      .order('created_at', { ascending: false })\n      .limit(MAX_GUEST_RSVP_CONFLICT_HISTORY_ROWS),");
    expect(page).toContain(".order('changed_at', { ascending: false })\n          .limit(MAX_GUEST_AUDIT_ROWS);");
  });
});
