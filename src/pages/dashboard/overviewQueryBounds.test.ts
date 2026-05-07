import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('overview query bounds', () => {
  it('uses exact counts and caps recent RSVP hydration', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/Overview.tsx'), 'utf8');

    expect(source).toContain('export const MAX_OVERVIEW_RECENT_RSVPS = 5;');
    expect(source).toContain("const OVERVIEW_GUEST_SELECT = 'id, rsvp_status, rsvp_received_at, first_name, last_name, name';");
    expect(source).toContain(".select('id', { count: 'exact', head: true })");
    expect(source).toContain(".or('rsvp_status.is.null,rsvp_status.eq.pending')");
    expect(source).toContain(".or('email.not.is.null,phone.not.is.null')");
    expect(source).toContain(".select(OVERVIEW_GUEST_SELECT)");
    expect(source).toContain(".limit(MAX_OVERVIEW_RECENT_RSVPS),");
    expect(source).not.toContain(".select('id, rsvp_status, rsvp_received_at, first_name, last_name, name, email, phone')");
  });
});
