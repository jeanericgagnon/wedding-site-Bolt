import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('release launch gate workflow', () => {
  it('requires launch proof secrets and runs strict live launch proof', () => {
    const source = readFileSync(join(process.cwd(), '.github/workflows/release-launch-gate.yml'), 'utf8');

    expect(source).toContain('name: Release Launch Gate');
    expect(source).toContain('Require launch proof secrets');
    expect(source).toContain('exit 1');
    expect(source).toContain('V1_OWNER_EMAIL');
    expect(source).toContain('V1_OWNER_PASSWORD');
    expect(source).toContain('LIVE_GUEST_DASHBOARD_SETTINGS_RPCS: 1');
    expect(source).toContain('npm run proof:v1:guests-rsvp-ops');
    expect(source).toContain('npm run proof:v1:ast-security');
    expect(source).toContain('npm run proof:v1:client-rls-matrix -- --require-live');
    expect(source).toContain('npm run proof:v1:registry-preview-ssrf -- --require-live');
    expect(source).toContain('npm run smoke:rsvp:strict');
    expect(source).not.toContain('Skipping smoke:rsvp:strict');
  });
});
