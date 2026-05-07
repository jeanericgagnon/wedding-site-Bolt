import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { MAX_AUDIT_LOG_ROWS } from './auditLogService';
import { MAX_ERROR_LOG_ROWS } from './errorLogService';

describe('admin log service query bounds', () => {
  it('exports stable admin log caps', () => {
    expect(MAX_ERROR_LOG_ROWS).toBe(100);
    expect(MAX_AUDIT_LOG_ROWS).toBe(50);
  });

  it('keeps error log reads bounded', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/errorLogService.ts'), 'utf8');

    expect(source).toContain('.limit(MAX_ERROR_LOG_ROWS);');
  });

  it('keeps audit log reads and guest-name follow-up bounded', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/auditLogService.ts'), 'utf8');

    expect(source).toContain('.limit(MAX_AUDIT_LOG_ROWS),');
    expect(source).toContain('listAppActionAuditLogs(siteId, MAX_AUDIT_LOG_ROWS),');
    expect(source).toContain(".in('id', guestIds.slice(0, MAX_AUDIT_LOG_ROWS));");
  });
});
