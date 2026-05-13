import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('guest lookup scope proof script', () => {
  it('proves household-wide public updates require the stronger phone-last4 verifier', () => {
    const source = readFileSync('scripts/v1-proof-guest-lookup-scope.mjs', 'utf8');

    expect(source).toContain("household_verifier: '9999'");
    expect(source).toContain('exactNameWithoutHouseholdVerifier');
    expect(source).toContain('contact-session-submit-household-requires-last4');
    expect(source).toContain('match?.household_updates_allowed === expectedHouseholdAllowed');
    expect(source).toContain("phone: '5555550999'");
    expect(source).toContain('Add the last 4 digits of the phone number on file before updating your whole party.');
  });
});
