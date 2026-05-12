import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('client RLS matrix proof script', () => {
  it('aggregates the current anon, RSVP, and collaborator runtime role lanes', () => {
    const source = readFileSync('scripts/v1-proof-client-rls-matrix.mjs', 'utf8');

    expect(source).toContain("slice: 'client-rls-matrix'");
    expect(source).toContain('npm run proof:v1:guest-lookup-scope');
    expect(source).toContain('npm run proof:v1:guests-rsvp-ops');
    expect(source).toContain('npm run proof:v1:collaborator-runtime');
    expect(source).toContain('viewer deny');
    expect(source).toContain('Guest-scoped collaborators can mutate guest rows directly');
    expect(source).toContain('network_access_required');
    expect(source).toContain('browser_runtime_required');
  });
});
