import { describe, expect, it } from 'vitest';

import { formatGuestOpsDateTime, formatGuestOpsRelativeTime, getGuestOpsTimestamp } from './guestOpsTime';

describe('guest ops time guards', () => {
  it('drops invalid persisted timestamps instead of leaking NaN relative times', () => {
    expect(getGuestOpsTimestamp('not-a-date')).toBe(Number.NEGATIVE_INFINITY);
    expect(formatGuestOpsRelativeTime('not-a-date')).toBe('Unknown time');
    expect(formatGuestOpsDateTime('not-a-date')).toBe('Unknown time');
  });

  it('keeps valid relative times truthful', () => {
    const now = new Date('2026-06-21T19:30:00.000Z').getTime();
    expect(formatGuestOpsRelativeTime('2026-06-21T18:30:00.000Z', now)).toBe('1h ago');
    expect(formatGuestOpsDateTime('2026-06-21T18:30:00.000Z')).toBe(
      new Date('2026-06-21T18:30:00.000Z').toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
    );
  });
});
