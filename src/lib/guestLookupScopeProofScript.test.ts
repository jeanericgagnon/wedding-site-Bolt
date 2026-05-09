import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('guest lookup scope proof script', () => {
  it('keeps live guest-contact lookup scoping checks explicit', () => {
    const script = readFileSync('scripts/v1-proof-guest-lookup-scope.mjs', 'utf8');

    expect(script).toContain("query: lastName");
    expect(script).toContain('query: `Taylor Wrong${runId}`');
    expect(script).toContain('query: `${lastName} Taylor`');
    expect(script).toContain('query: `Taylor ${lastName}`');
    expect(script).toContain("const forbiddenKeys = ['id', 'guestId', 'guest_id', 'household_id', 'householdId', 'wedding_site_id', 'weddingSiteId'];");
    expect(script).toContain("authMode: accessArtifacts.inviteToken ? 'invite-token' : 'public'");
  });
});
