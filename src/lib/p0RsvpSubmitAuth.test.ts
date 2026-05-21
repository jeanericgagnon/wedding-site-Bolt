import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('P0 RSVP submit authorization', () => {
  it('requires validated rsvp session for guest submit paths', () => {
    const source = readFileSync(join(process.cwd(), 'supabase', 'functions', 'validate-rsvp-token', 'index.ts'), 'utf8');

    expect(source).toContain('if (!guestId || !rsvpSession) return json({ error: "guestId and rsvpSession are required" }, 400);');
    expect(source).toContain('const guest = await validateRsvpSession(guestId, rsvpSession);');
    expect(source).toContain('payload.scope !== "rsvp" || payload.guestId !== guestId || payload.exp <= Date.now()');
    expect(source).toContain('const inviteTokenHash = await sha256Hex(`${guest.invite_token}:${supabaseUrl}`);');
    expect(source).toContain('if (inviteTokenHash !== payload.inviteTokenHash) return null;');
  });

  it('keeps token-first lookup and rate limit protections in place', () => {
    const source = readFileSync(join(process.cwd(), 'supabase', 'functions', 'validate-rsvp-token', 'index.ts'), 'utf8');

    expect(source).toContain('.eq("invite_token", trimmed).maybeSingle()');
    expect(source).toContain('enforceRateLimit("rsvp_lookup", trimmed, LOOKUP_RATE_LIMIT_MAX_ATTEMPTS)');
    expect(source).toContain('RSVP_SEARCH_REQUIRED_COPY = "Enter the invitation code from your invitation."');
  });

  it('keeps optional name lookup site-scoped and safe-field only', () => {
    const source = readFileSync(join(process.cwd(), 'supabase', 'functions', 'validate-rsvp-token', 'index.ts'), 'utf8');

    expect(source).toContain('payload.action === "lookup_name"');
    expect(source).toContain('ENABLE_PUBLIC_RSVP_NAME_LOOKUP');
    expect(source).toContain('if (!siteRef || normalizedName.length < 5 || queryParts.length < 2)');
    expect(source).toContain('enforceRateLimit("rsvp_lookup_name"');
    expect(source).toContain('.eq("wedding_site_id", site.id)');
    expect(source).toContain('email_hint: maskEmailHint(row.email)');
    expect(source).toContain('phone_hint: maskPhoneHint(row.phone)');
    expect(source).not.toContain('matches: [{ invite_token');
  });
});
