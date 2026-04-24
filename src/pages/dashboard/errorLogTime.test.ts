import { describe, expect, it } from 'vitest';

import { formatErrorLogDateTime, getErrorLogTimestamp, toValidErrorLogDateOrNull } from './errorLogTime';

describe('error log time guards', () => {
  it('drops invalid persisted log timestamps instead of rendering Invalid Date', () => {
    expect(toValidErrorLogDateOrNull('not-a-date')).toBeNull();
    expect(getErrorLogTimestamp('not-a-date')).toBe(Number.NEGATIVE_INFINITY);
    expect(formatErrorLogDateTime('not-a-date')).toBe('Unknown time');
  });

  it('keeps valid log timestamps truthful', () => {
    expect(getErrorLogTimestamp('2026-06-21T18:30:00.000Z')).toBe(new Date('2026-06-21T18:30:00.000Z').getTime());
  });
});
