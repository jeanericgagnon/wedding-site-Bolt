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

  it('resolves RSVP replacement site id without relying on min(uuid)', () => {
    const source = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260525040000_fix_guest_dashboard_rsvp_replace_many_site_resolution.sql'),
      'utf8',
    );

    expect(source).toContain("create or replace function public.guest_dashboard_rsvp_replace_many(");
    expect(source).toContain('select wedding_site_id');
    expect(source).toContain('where wedding_site_id is not null');
    expect(source).toContain('limit 1;');
    expect(source).not.toContain('select min(wedding_site_id)');
  });

  it('resolves guest bulk patch site id without relying on min(uuid)', () => {
    const source = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260525050000_fix_guest_dashboard_guest_bulk_patch_site_resolution.sql'),
      'utf8',
    );

    expect(source).toContain("create or replace function public.guest_dashboard_guest_bulk_patch(");
    expect(source).toContain('select wedding_site_id');
    expect(source).toContain('and wedding_site_id is not null');
    expect(source).toContain('limit 1;');
    expect(source).not.toContain('select min(wedding_site_id)');
  });
});
