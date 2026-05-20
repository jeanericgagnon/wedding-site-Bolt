import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('ci hardpass workflow', () => {
  it('requires launch proof secrets and keeps live launch checks hard-required', () => {
    const source = readFileSync(join(process.cwd(), '.github/workflows/ci-hardpass.yml'), 'utf8');

    expect(source).toContain('name: CI Hardpass RSVP/CSV');
    expect(source).toContain('Require launch proof secrets');
    expect(source).toContain('Missing VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY/V1_OWNER_EMAIL/V1_OWNER_PASSWORD secrets required for launch proof.');
    expect(source).toContain('LIVE_GUEST_DASHBOARD_SETTINGS_RPCS: 1');
    expect(source).toContain('run: npm run proof:v1:ast-security');
    expect(source).toContain('run: npm run proof:v1:security-automation');
    expect(source).toContain('run: npm run proof:v1:client-rls-matrix -- --require-live');
    expect(source).toContain('run: npm run proof:v1:board:freshness');
    expect(source).not.toContain('run: npm run proof:v1:board');
    expect(source).not.toContain('run: npm run proof:v1:board:md');
    expect(source).toContain('run: npm run smoke:rsvp:strict');
    expect(source).not.toContain('Skipping smoke:rsvp:strict');
    expect(source).not.toContain("if: ${{ env.VITE_SUPABASE_URL != '' && env.VITE_SUPABASE_ANON_KEY != '' }}");
  });
});
