import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('admin access RPC boundary', () => {
  it('moves admin checks behind a secure RPC and removes direct authenticated table reads', () => {
    const migration = readFileSync('supabase/migrations/20260512050000_harden_admin_access_check.sql', 'utf8');
    const adminUsers = readFileSync('src/lib/adminUsers.ts', 'utf8');

    expect(migration).toContain('drop policy if exists "Authenticated can check own admin status" on public.admin_users;');
    expect(migration).toContain('create or replace function public.admin_access_check()');
    expect(migration).toContain('security definer');
    expect(migration).toContain('grant execute on function public.admin_access_check() to authenticated;');
    expect(adminUsers).toContain(".rpc('admin_access_check')");
    expect(adminUsers).not.toContain(".from('admin_users')");
    expect(adminUsers).not.toContain('ADMIN_USER_SELECT');
  });
});
