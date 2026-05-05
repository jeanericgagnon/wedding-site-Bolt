import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function serviceRoleFunctionNames(): string[] {
  const root = join(process.cwd(), 'supabase', 'functions');
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => {
      const filePath = join(root, name, 'index.ts');
      return existsSync(filePath) && readFileSync(filePath, 'utf8').includes('SUPABASE_SERVICE_ROLE_KEY');
    })
    .sort();
}

describe('service-role authorization disposition', () => {
  it('documents every service-role Edge Function before launch claim', () => {
    const disposition = readFileSync('docs/service-role-authorization-disposition-2026-05-05.md', 'utf8');
    const missing = serviceRoleFunctionNames().filter((name) => !disposition.includes(`\`${name}\``));

    expect(missing).toEqual([]);
    expect(disposition).toContain('Still Needs Live Proof');
    expect(disposition).toContain('process-email-queue` now rejects non-service-role callers');
  });
});
