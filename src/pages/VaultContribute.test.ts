import { describe, expect, it } from 'vitest';

import { getVaultCoupleName, getVaultUnlockAtIso, getVaultUnlockYear } from './VaultContribute';

describe('getVaultCoupleName', () => {
  it('keeps a single partner name truthful instead of showing a broken ampersand', () => {
    expect(getVaultCoupleName({ couple_name_1: 'Alex', couple_name_2: '   ' })).toBe('Alex');
  });

  it('falls back cleanly when both partner names are blank', () => {
    expect(getVaultCoupleName({ couple_name_1: '  ', couple_name_2: null })).toBe('the couple');
  });
});

describe('getVaultUnlockYear', () => {
  it('skips invalid wedding dates instead of surfacing NaN unlock years', () => {
    expect(getVaultUnlockYear('not-a-date', 5)).toBeNull();
  });

  it('returns the anniversary year when the wedding date is valid', () => {
    expect(getVaultUnlockYear('2026-02-23', 10)).toBe(2036);
  });
});

describe('getVaultUnlockAtIso', () => {
  it('skips invalid persisted wedding dates instead of throwing on toISOString', () => {
    expect(getVaultUnlockAtIso('not-a-date', 5)).toBeNull();
    expect(getVaultUnlockAtIso(null, 5)).toBeNull();
  });

  it('returns the matching anniversary unlock timestamp when the wedding date is valid', () => {
    expect(getVaultUnlockAtIso('2026-02-23', 5)).toBe(new Date('2031-02-23T00:00:00.000Z').toISOString());
  });
});
