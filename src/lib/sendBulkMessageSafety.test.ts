import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('send-bulk-message safety guard', () => {
  it('keeps unexpected message-send failures guest-safe', () => {
    const functionSource = readFileSync(join(process.cwd(), 'supabase/functions/send-bulk-message/index.ts'), 'utf8');

    expect(functionSource).toContain('const SMS_SENDING_ENABLED = smsSendingEnabledRaw === "true"');
    expect(functionSource).toContain('Texting stays locked until sender setup, consent, opt-out, and delivery readiness are complete.');
    expect(functionSource).toContain('SEND_BULK_MESSAGE_UNEXPECTED_FAILED');
    expect(functionSource).toContain('UNEXPECTED_SEND_BULK_FAILURE');
    expect(functionSource).toContain('return jsonResponse(500, { error: "Could not process this message. Please try again." });');
    expect(functionSource).not.toContain('const message = err instanceof Error ? err.message : "Internal server error";');
    expect(functionSource).not.toContain('return jsonResponse(500, { error: message });');
  });
});
