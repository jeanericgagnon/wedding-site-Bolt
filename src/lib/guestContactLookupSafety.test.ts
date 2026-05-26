import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('guest-contact-lookup safety guard', () => {
  it('keeps unexpected lookup failures guest-safe', () => {
    const functionSource = readFileSync(join(process.cwd(), 'supabase/functions/guest-contact-lookup/index.ts'), 'utf8');

    expect(functionSource).toContain('GUEST_CONTACT_LOOKUP_UNEXPECTED_FAILED');
    expect(functionSource).toContain('UNEXPECTED_GUEST_CONTACT_LOOKUP_FAILURE');
    expect(functionSource).toContain('return new Response(JSON.stringify({ error: "Could not look up guests. Please try again." }), {');
    expect(functionSource).not.toContain('return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), {');
  });
});
