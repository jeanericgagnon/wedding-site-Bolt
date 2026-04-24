import { describe, expect, it } from 'vitest';

import { getVaultUnlockDate, toValidDateOrNull } from './vaultDate';

describe('vaultDate guards', () => {
  it('drops invalid persisted wedding dates instead of keeping Invalid Date state', () => {
    expect(toValidDateOrNull('not-a-date')).toBeNull();
  });

  it('skips unlock date generation when the persisted wedding date is invalid', () => {
    expect(getVaultUnlockDate('not-a-date', 5)).toBeNull();
  });

  it('builds a valid unlock date when the wedding date is valid', () => {
    expect(getVaultUnlockDate('2026-02-23', 10)?.toISOString().slice(0, 10)).toBe('2036-02-23');
  });
});
