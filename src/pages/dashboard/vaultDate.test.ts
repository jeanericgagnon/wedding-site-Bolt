import { describe, expect, it } from 'vitest';

import { formatVaultUnlockDate, getVaultUnlockDate, toValidDateOrNull } from './vaultDate';

describe('vaultDate guards', () => {
  it('drops invalid persisted wedding dates instead of keeping Invalid Date state', () => {
    expect(toValidDateOrNull('not-a-date')).toBeNull();
    expect(toValidDateOrNull('2027-02-30')).toBeNull();
  });

  it('skips unlock date generation when the persisted wedding date is invalid', () => {
    expect(getVaultUnlockDate('not-a-date', 5)).toBeNull();
    expect(getVaultUnlockDate('2027-02-30', 5)).toBeNull();
  });

  it('builds a valid unlock date when the wedding date is valid', () => {
    expect(getVaultUnlockDate('2026-02-23', 10)?.toISOString().slice(0, 10)).toBe('2036-02-23');
  });

  it('formats invalid persisted unlock dates with a clean fallback', () => {
    expect(formatVaultUnlockDate('not-a-date')).toBe('Unknown date');
  });

  it('formats valid unlock dates truthfully', () => {
    const value = '2036-02-23T00:00:00.000Z';
    expect(formatVaultUnlockDate(value)).toBe(
      new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    );
  });

  it('formats date-only vault dates as the saved local calendar day', () => {
    expect(formatVaultUnlockDate('2036-02-23')).toBe(
      new Date(2036, 1, 23).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    );
    expect(getVaultUnlockDate('2026-02-23', 10)?.toLocaleDateString('en-US')).toBe(
      new Date(2036, 1, 23).toLocaleDateString('en-US'),
    );
  });
});
