import { describe, expect, it } from 'vitest';

import {
  ageExceedsMs,
  formatRegistryItemDate,
  getRegistryItemTimestamp,
  isRegistryItemDue,
} from './registryItemTime';

describe('registry item time guards', () => {
  it('treats invalid persisted timestamps as due/stale without leaking Invalid Date', () => {
    expect(getRegistryItemTimestamp('not-a-date')).toBe(Number.NEGATIVE_INFINITY);
    expect(getRegistryItemTimestamp('2027-02-30')).toBe(Number.NEGATIVE_INFINITY);
    expect(isRegistryItemDue('not-a-date')).toBe(true);
    expect(isRegistryItemDue('2027-02-30')).toBe(true);
    expect(ageExceedsMs('not-a-date', 60_000)).toBe(true);
    expect(ageExceedsMs('2027-02-30', 60_000)).toBe(true);
    expect(formatRegistryItemDate('not-a-date')).toBe('Unknown date');
    expect(formatRegistryItemDate('2027-02-30')).toBe('Unknown date');
  });

  it('keeps valid persisted timestamps truthful', () => {
    const value = '2026-06-21T18:30:00.000Z';
    const now = new Date('2026-06-21T19:30:00.000Z').getTime();
    expect(getRegistryItemTimestamp(value)).toBe(new Date(value).getTime());
    expect(isRegistryItemDue('2026-06-21T20:30:00.000Z', now)).toBe(false);
    expect(ageExceedsMs(value, 30 * 60 * 1000, now)).toBe(true);
    expect(formatRegistryItemDate(value)).toBe(new Date(value).toLocaleDateString('en-US'));
    expect(
      formatRegistryItemDate(value, { month: 'short', day: 'numeric', year: 'numeric' }),
    ).toBe(new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
  });

  it('formats date-only registry item dates as the saved local calendar day', () => {
    const value = '2026-06-15';
    const localDate = new Date(2026, 5, 15);

    expect(getRegistryItemTimestamp(value)).toBe(localDate.getTime());
    expect(formatRegistryItemDate(value)).toBe(localDate.toLocaleDateString('en-US'));
    expect(formatRegistryItemDate(value, { month: 'short', day: 'numeric', year: 'numeric' })).toBe(
      localDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    );
  });
});
