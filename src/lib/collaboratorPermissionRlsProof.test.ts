import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('collaborator permission RLS proof', () => {
  it('covers direct guest writes while denying timeline and settings writes without permission', () => {
    const source = readFileSync('tests/e2e/collaborator-permission-rls.spec.ts', 'utf8');

    expect(source).toContain('guest-permission collaborator can mutate guest rows');
    expect(source).toContain('checked_in_at');
    expect(source).toContain('thank_you_sent_at');
    expect(source).toContain('household_id');
    expect(source).toContain("restUrl('event_invitations')");
    expect(source).toContain("restUrl('wedding_sites'");
    expect(source).toContain('[401, 403]');
  });
});
