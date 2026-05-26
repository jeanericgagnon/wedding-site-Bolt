import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('process-email-queue safety guard', () => {
  it('keeps unexpected queue failures guest-safe', () => {
    const functionSource = readFileSync(join(process.cwd(), 'supabase/functions/process-email-queue/index.ts'), 'utf8');

    expect(functionSource).toContain('PROCESS_EMAIL_QUEUE_UNEXPECTED_FAILED');
    expect(functionSource).toContain('UNEXPECTED_EMAIL_QUEUE_FAILURE');
    expect(functionSource).toContain('return json({ error: "Could not process email queue. Please try again." }, 500);');
    expect(functionSource).not.toContain('const message = err instanceof Error ? err.message : "Internal server error";');
    expect(functionSource).not.toContain('return json({ error: message }, 500);');
  });
});
