import { describe, expect, it } from 'vitest';

import {
  getWeddingRefreshWindowDate,
  parseRefreshWindowEndIso,
  toDateInputValueOrEmpty,
  toValidDateOrNull,
} from './registryRefreshWindow';

describe('registry refresh window guards', () => {
  it('drops invalid persisted refresh-window timestamps instead of hydrating broken date inputs', () => {
    expect(toDateInputValueOrEmpty('not-a-date')).toBe('');
    expect(toValidDateOrNull('not-a-date')).toBeNull();
    expect(toDateInputValueOrEmpty('2027-02-30')).toBe('');
    expect(toValidDateOrNull('2027-02-30')).toBeNull();
  });

  it('rejects malformed owner refresh-window drafts instead of throwing Invalid time value', () => {
    expect(parseRefreshWindowEndIso('not-a-date')).toBeUndefined();
    expect(parseRefreshWindowEndIso('2027-02-30')).toBeUndefined();
  });

  it('keeps valid wedding-based refresh windows truthful', () => {
    expect(parseRefreshWindowEndIso('2026-06-21')).toBe('2026-06-21T23:59:59.000Z');
    expect(getWeddingRefreshWindowDate('2026-06-21')?.toISOString().slice(0, 10)).toBe('2026-07-21');
  });

  it('preserves date-only refresh windows as local calendar dates', () => {
    expect(toValidDateOrNull('2026-09-12')?.getTime()).toBe(new Date(2026, 8, 12).getTime());
    expect(toDateInputValueOrEmpty('2026-09-12')).toBe('2026-09-12');
    expect(getWeddingRefreshWindowDate('2026-09-12')?.toLocaleDateString('en-US')).toBe(
      new Date(2026, 9, 12).toLocaleDateString('en-US'),
    );
  });
});
