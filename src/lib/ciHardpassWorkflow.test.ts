import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('ci hardpass workflow', () => {
  it('requires Supabase RSVP secrets and always runs strict RSVP smoke', () => {
    const source = readFileSync(join(process.cwd(), '.github/workflows/ci-hardpass.yml'), 'utf8');

    expect(source).toContain('name: CI Hardpass RSVP/CSV');
    expect(source).toContain('Require Supabase RSVP proof secrets');
    expect(source).toContain('Missing VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY secrets required for smoke:rsvp:strict.');
    expect(source).toContain('run: npm run smoke:rsvp:strict');
    expect(source).not.toContain('Skipping smoke:rsvp:strict');
    expect(source).not.toContain("if: ${{ env.VITE_SUPABASE_URL != '' && env.VITE_SUPABASE_ANON_KEY != '' }}");
  });
});
