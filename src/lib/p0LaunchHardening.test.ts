import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('P0 launch hardening guards', () => {
  it('keeps guest contact name lookup disabled by default unless explicitly enabled', () => {
    const source = read('supabase/functions/guest-contact-lookup/index.ts');
    expect(source).toContain('ENABLE_GUEST_NAME_LOOKUP');
    expect(source).toContain('if (!guestNameLookupEnabled)');
  });

  it('keeps sms inbound behind twilio signature checks and non-mutating stop/help handling', () => {
    const source = read('supabase/functions/sms-rsvp-inbound/index.ts');
    expect(source).toContain('x-twilio-signature');
    expect(source).toContain('TWILIO_WEBHOOK_URL');
    expect(source).toContain('return new Response("Forbidden", { status: 403');
    expect(source).toContain('process_result: "opt_out"');
    expect(source).toContain('process_result: "help"');
  });

  it('derives launch-safe email senders from explicit env configuration', () => {
    const sender = read('supabase/functions/_shared/emailSender.ts');
    const bulk = read('supabase/functions/send-bulk-message/index.ts');
    const queue = read('supabase/functions/process-email-queue/index.ts');

    expect(sender).toContain('set FROM_EMAIL or FROM_EMAIL_DOMAIN');
    expect(bulk).toContain('resolveLaunchFromAddress');
    expect(queue).toContain('resolveLaunchFromAddress');
    expect(queue).not.toContain('onboarding@resend.dev');
  });
});
