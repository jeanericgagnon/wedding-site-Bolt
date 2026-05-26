import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('validate-rsvp-token safety guard', () => {
  it('returns a guest-safe fallback instead of leaking raw unexpected errors', () => {
    const functionSource = readFileSync(join(process.cwd(), 'supabase/functions/validate-rsvp-token/index.ts'), 'utf8');

    expect(functionSource).toContain('VALIDATE_RSVP_TOKEN_UNEXPECTED_FAILED');
    expect(functionSource).toContain('UNEXPECTED_RSVP_TOKEN_VALIDATION_FAILURE');
    expect(functionSource).toContain('return json({ error: "Could not update this RSVP. Please try again." }, 500);');
    expect(functionSource).not.toContain('const message = err instanceof Error ? err.message : "Internal server error";');
    expect(functionSource).not.toContain('return json({ error: message }, 500);');
  });
});
