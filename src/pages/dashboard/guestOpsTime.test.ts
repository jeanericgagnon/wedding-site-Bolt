import { describe, expect, it } from 'vitest';

import { formatGuestOpsDate, formatGuestOpsDateTime, formatGuestOpsRelativeTime, getGuestOpsTimestamp } from './guestOpsTime';

describe('guest ops time guards', () => {
  it('drops invalid persisted timestamps instead of leaking NaN relative times', () => {
    expect(getGuestOpsTimestamp('not-a-date')).toBe(Number.NEGATIVE_INFINITY);
    expect(getGuestOpsTimestamp('2027-02-30')).toBe(Number.NEGATIVE_INFINITY);
    expect(formatGuestOpsRelativeTime('not-a-date')).toBe('Unknown time');
    expect(formatGuestOpsRelativeTime('2027-02-30')).toBe('Unknown time');
    expect(formatGuestOpsDateTime('not-a-date')).toBe('Unknown time');
    expect(formatGuestOpsDateTime('2027-02-30')).toBe('Unknown time');
    expect(formatGuestOpsDateTime('not-a-date', { hour: 'numeric', minute: '2-digit' })).toBe('Unknown time');
    expect(formatGuestOpsDateTime('2027-02-30', { hour: 'numeric', minute: '2-digit' })).toBe('Unknown time');
    expect(formatGuestOpsDate('not-a-date')).toBe('Unknown date');
    expect(formatGuestOpsDate('2027-02-30')).toBe('Unknown date');
  });

  it('keeps valid relative times truthful', () => {
    const now = new Date('2026-06-21T19:30:00.000Z').getTime();
    expect(formatGuestOpsRelativeTime('2026-06-21T18:30:00.000Z', now)).toBe('1h ago');
    expect(formatGuestOpsDateTime('2026-06-21T18:30:00.000Z')).toBe(
      new Date('2026-06-21T18:30:00.000Z').toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
    );
    expect(formatGuestOpsDate('2026-06-21T18:30:00.000Z')).toBe(
      new Date('2026-06-21T18:30:00.000Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    );
  });

  it('formats date-only guest ops timestamps as the saved local calendar day', () => {
    const value = '2026-09-12';
    expect(getGuestOpsTimestamp(value)).toBe(new Date(2026, 8, 12).getTime());
    expect(formatGuestOpsDate(value)).toBe(
      new Date(2026, 8, 12).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    );
    expect(formatGuestOpsDateTime(value)).toBe(
      new Date(2026, 8, 12).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
    );
  });
});
