import { describe, expect, it } from 'vitest';

import {
  calcOverviewDaysUntil,
  formatOverviewRelativeTime,
  formatOverviewWeddingDate,
  getOverviewTimestamp,
} from './overviewDate';

describe('overviewDate', () => {
  it('guards invalid persisted overview dates', () => {
    expect(getOverviewTimestamp('not-a-date')).toBe(Number.NEGATIVE_INFINITY);
    expect(formatOverviewRelativeTime('not-a-date')).toBe('Unknown time');
    expect(formatOverviewWeddingDate('not-a-date')).toBe('Unknown date');
    expect(calcOverviewDaysUntil('not-a-date')).toBeNull();
  });

  it('keeps valid overview dates truthful', () => {
    const value = '2026-06-20T12:00:00.000Z';
    const timestamp = new Date(value).getTime();
    expect(getOverviewTimestamp(value)).toBe(timestamp);
    expect(formatOverviewRelativeTime(value, timestamp + 60 * 60 * 1000)).toBe('1h ago');
    expect(formatOverviewWeddingDate(value)).toBe(new Date(value).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }));
    expect(calcOverviewDaysUntil('2026-06-22', new Date('2026-06-20T18:00:00.000Z'))).toBe(1);
  });
});
