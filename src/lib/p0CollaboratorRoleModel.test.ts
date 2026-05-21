import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('P0 collaborator role model parity', () => {
  it('keeps planner in generated collaborator role unions', () => {
    const generated = readFileSync(join(process.cwd(), 'src', 'types', 'supabase.generated.ts'), 'utf8');
    expect(generated).toContain('"owner" | "coordinator" | "viewer" | "planner"');
  });

  it('keeps planner enum migration idempotent and explicit', () => {
    const migration = readFileSync(join(process.cwd(), 'supabase', 'migrations', '20260413094500_add_planner_role_rbac_stub.sql'), 'utf8');
    expect(migration).toContain("ADD VALUE 'planner'");
    expect(migration).toContain('IF NOT EXISTS (');
  });

  it('keeps planner/coordinator as mutating collaborators and viewer excluded', () => {
    const permissions = readFileSync(join(process.cwd(), 'supabase', 'functions', '_shared', 'collaboratorPermissions.ts'), 'utf8');
    expect(permissions).toContain('role === "planner" || role === "coordinator"');
    expect(permissions).not.toContain('role === "viewer"');
  });
});
