import { describe, expect, it } from 'vitest';

import {
  formatVaultEntryDate,
  getVaultEntryTimestamp,
  toValidVaultEntryDateOrNull,
} from './vaultEntryTime';

describe('vault entry time guards', () => {
  it('drops invalid persisted vault entry timestamps instead of leaking Invalid Date', () => {
    expect(toValidVaultEntryDateOrNull('not-a-date')).toBeNull();
    expect(toValidVaultEntryDateOrNull('2027-02-30')).toBeNull();
    expect(getVaultEntryTimestamp('not-a-date')).toBe(Number.NEGATIVE_INFINITY);
    expect(getVaultEntryTimestamp('2027-02-30')).toBe(Number.NEGATIVE_INFINITY);
    expect(formatVaultEntryDate('not-a-date')).toBe('Unknown date');
    expect(formatVaultEntryDate('2027-02-30')).toBe('Unknown date');
  });

  it('keeps valid vault entry timestamps truthful', () => {
    expect(getVaultEntryTimestamp('2026-06-21T18:30:00.000Z')).toBe(new Date('2026-06-21T18:30:00.000Z').getTime());
    expect(formatVaultEntryDate('2026-06-21T18:30:00.000Z')).toBe('Jun 21, 2026');
    expect(formatVaultEntryDate('2026-06-21T18:30:00.000Z', { month: 'long', year: 'numeric' })).toBe('June 2026');
  });

  it('formats date-only vault entry timestamps as the saved local calendar day', () => {
    expect(formatVaultEntryDate('2026-09-12')).toBe(
      new Date(2026, 8, 12).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    );
    expect(getVaultEntryTimestamp('2026-09-12')).toBe(new Date(2026, 8, 12).getTime());
  });
});
