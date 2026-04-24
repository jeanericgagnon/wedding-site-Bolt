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
  });

  it('rejects malformed owner refresh-window drafts instead of throwing Invalid time value', () => {
    expect(parseRefreshWindowEndIso('not-a-date')).toBeUndefined();
  });

  it('keeps valid wedding-based refresh windows truthful', () => {
    expect(parseRefreshWindowEndIso('2026-06-21')).toBe('2026-06-21T23:59:59.000Z');
    expect(getWeddingRefreshWindowDate('2026-06-21')?.toISOString().slice(0, 10)).toBe('2026-07-21');
  });
});
