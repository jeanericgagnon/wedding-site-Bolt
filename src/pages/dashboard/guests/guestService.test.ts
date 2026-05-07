import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GUEST_DASHBOARD_RSVP_SELECT, MAX_GUEST_RSVP_LOOKUP_IDS, toEventInvitationRows } from './guestService';

describe('guestService', () => {
  it('keeps guest RSVP reads explicitly projected', () => {
    expect(GUEST_DASHBOARD_RSVP_SELECT).toContain('guest_id');
    expect(GUEST_DASHBOARD_RSVP_SELECT).toContain('custom_answers');
    expect(GUEST_DASHBOARD_RSVP_SELECT).not.toContain('*');
    expect(MAX_GUEST_RSVP_LOOKUP_IDS).toBe(5000);
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
    expect(page).not.toContain("supabase.rpc('generate_secure_token'");
    expect(service).toContain("supabase.rpc('generate_secure_token'");
    expect(service).toContain('export async function generateSecureGuestInviteToken()');
  });

  it('keeps guest RSVP lookup fan-out bounded', () => {
    const service = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/guestService.ts'), 'utf8');

    expect(service).toContain('MAX_GUEST_RSVP_LOOKUP_IDS = 5000');
    expect(service).toContain('const scopedGuestIds = guestIds.slice(0, MAX_GUEST_RSVP_LOOKUP_IDS);');
    expect(service).toContain(".in('guest_id', scopedGuestIds);");
  });
});
