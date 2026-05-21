import { describe, expect, it } from 'vitest';

import { formatErrorLogDateTime, getErrorLogTimestamp, toValidErrorLogDateOrNull } from './errorLogTime';

describe('error log time guards', () => {
  it('drops invalid persisted log timestamps instead of rendering Invalid Date', () => {
    expect(toValidErrorLogDateOrNull('not-a-date')).toBeNull();
    expect(toValidErrorLogDateOrNull('2027-02-30')).toBeNull();
    expect(getErrorLogTimestamp('not-a-date')).toBe(Number.NEGATIVE_INFINITY);
    expect(getErrorLogTimestamp('2027-02-30')).toBe(Number.NEGATIVE_INFINITY);
    expect(formatErrorLogDateTime('not-a-date')).toBe('Unknown time');
    expect(formatErrorLogDateTime('2027-02-30')).toBe('Unknown time');
  });

  it('keeps valid log timestamps truthful', () => {
    expect(getErrorLogTimestamp('2026-06-21T18:30:00.000Z')).toBe(new Date('2026-06-21T18:30:00.000Z').getTime());
  });

  it('formats date-only log timestamps as the saved local calendar day', () => {
    expect(getErrorLogTimestamp('2026-09-12')).toBe(new Date(2026, 8, 12).getTime());
    expect(formatErrorLogDateTime('2026-09-12')).toBe(new Date(2026, 8, 12).toLocaleString());
  });
});
