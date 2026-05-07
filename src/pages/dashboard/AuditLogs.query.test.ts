import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('DashboardAuditLogs query contract', () => {
  it('does not rely on a missing guest_audit_logs to guests embed relationship', () => {
    const source = readFileSync(resolve(__dirname, 'auditLogService.ts'), 'utf8');

    expect(source).not.toContain('guest:guest_id');
    expect(source).toContain(".from('guest_audit_logs')");
    expect(source).toContain(".from('guests')");
    expect(source).toContain(".in('id', guestIds.slice(0, MAX_AUDIT_LOG_ROWS))");
  });
});
