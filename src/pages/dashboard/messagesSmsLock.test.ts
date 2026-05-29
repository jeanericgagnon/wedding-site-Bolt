import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Messages SMS lock contract', () => {
  it('keeps SMS composer and credits locked behind the shared readiness gate', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/Messages.tsx'), 'utf8');

    expect(source).toContain("import { SMS_CREDITS_LOCK_COPY, SMS_SENDING_ENABLED, SMS_WORKSPACE_LOCK_COPY } from '../../lib/smsLaunchReadiness';");
    expect(source).toContain("toast(SMS_WORKSPACE_LOCK_COPY, 'info');");
    expect(source).toContain("toast(SMS_WORKSPACE_LOCK_COPY, 'error');");
    expect(source).toContain("{SMS_SENDING_ENABLED ? 'SMS' : 'SMS (locked)'}");
    expect(source).toContain("SMS draft stays reviewable for");
    expect(source).toContain("disabled={buyingPack !== null || !SMS_SENDING_ENABLED}");
    expect(source).toContain("(formData.channel === 'sms' && !SMS_SENDING_ENABLED)");
  });
});
