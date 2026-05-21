import { describe, expect, it } from 'vitest';

import { formatAuditLogDateTime, toValidAuditLogDateOrNull } from './auditLogTime';

describe('audit log time guards', () => {
  it('drops invalid persisted audit timestamps instead of rendering Invalid Date', () => {
    expect(toValidAuditLogDateOrNull('not-a-date')).toBeNull();
    expect(toValidAuditLogDateOrNull('2027-02-30')).toBeNull();
    expect(formatAuditLogDateTime('not-a-date')).toBe('Unknown time');
    expect(formatAuditLogDateTime('2027-02-30')).toBe('Unknown time');
  });

  it('keeps valid audit timestamps truthful', () => {
    expect(formatAuditLogDateTime('2026-06-21T18:30:00.000Z')).toBe(new Date('2026-06-21T18:30:00.000Z').toLocaleString());
  });

  it('formats date-only audit timestamps as the saved local calendar day', () => {
    expect(formatAuditLogDateTime('2026-09-12')).toBe(new Date(2026, 8, 12).toLocaleString());
  });
});
