import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('send-wedding-email safety guard', () => {
  it('keeps provider and unexpected email failures guest-safe', () => {
    const functionSource = readFileSync(join(process.cwd(), 'supabase/functions/send-wedding-email/index.ts'), 'utf8');

    expect(functionSource).toContain('SEND_WEDDING_EMAIL_PROVIDER_FAILED');
    expect(functionSource).toContain('SEND_WEDDING_EMAIL_UNEXPECTED_FAILED');
    expect(functionSource).toContain('UNEXPECTED_SEND_EMAIL_FAILURE');
    expect(functionSource).toContain('return new Response(JSON.stringify({ error: "Could not send this email. Please try again." }), {');
    expect(functionSource).not.toContain('return new Response(JSON.stringify({ error: "Failed to send email", details: errorBody }), {');
    expect(functionSource).not.toContain('return new Response(JSON.stringify({ error: message }), {');
    expect(functionSource).not.toContain('const message = err instanceof Error ? err.message : "Internal server error";');
  });
});
