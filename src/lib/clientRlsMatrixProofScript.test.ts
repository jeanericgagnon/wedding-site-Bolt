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
    expect(source).toContain('Planner-scoped collaborators can write planning tasks, itinerary events, and dashboard messages');
    expect(source).toContain('Settings-scoped collaborators can patch site settings');
    expect(source).toContain('Registry-scoped collaborators can write registry items');
    expect(source).toContain('Photos-scoped collaborators can write vault configs');
    expect(source).toContain('Settings-scoped collaborators can patch site settings and write sections');
    expect(source).toContain('Coordinator-scoped collaborators can write seating events/tables, coordinator Q&A/check-in, and builder media assets');
    expect(source).toContain('Broaden the live client-RLS matrix beyond guest, planning, settings, registry, seating, coordinator, messages, and photos across remaining non-guest dashboard write surfaces.');
    expect(source).toContain('network_access_required');
    expect(source).toContain('browser_runtime_required');
    expect(source).toContain("LIVE_GUEST_DASHBOARD_SETTINGS_RPCS === '1'");
  });
});
