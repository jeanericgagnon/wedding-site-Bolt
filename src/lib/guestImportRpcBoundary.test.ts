import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('guest import RPC boundary', () => {
  it('resolves the import site id without relying on min(uuid)', () => {
    const source = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260525030500_fix_guest_dashboard_import_guests_site_resolution.sql'),
      'utf8',
    );

    expect(source).toContain("create or replace function public.guest_dashboard_import_guests(");
    expect(source).toContain("where nullif(row.value->>'wedding_site_id', '') is not null");
    expect(source).toContain('limit 1;');
    expect(source).not.toContain('select min(nullif(row.value->>');
  });
});
