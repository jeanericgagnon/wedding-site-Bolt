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

  it('keeps owner-facing activity labels free of raw ids', () => {
    const source = readFileSync(resolve(__dirname, 'AuditLogs.tsx'), 'utf8');

    expect(source).toContain("return UUID_LIKE.test(trimmed) ? fallback : trimmed;");
    expect(source).toContain("if (UUID_LIKE.test(trimmed)) return 'Wedding team';");
    expect(source).toContain("if (!trimmed) return 'System';");
    expect(source).toContain("detail: sanitizeAuditText(row.guest_name, 'Guest record')");
  });
});
