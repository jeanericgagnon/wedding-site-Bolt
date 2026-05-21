import { describe, expect, it } from 'vitest';

import { formatSettingsDate, toValidSettingsDateOrNull } from './settingsDate';

describe('settings date guards', () => {
  it('drops invalid persisted settings dates instead of rendering Invalid Date', () => {
    expect(toValidSettingsDateOrNull('not-a-date')).toBeNull();
    expect(toValidSettingsDateOrNull('2027-02-30')).toBeNull();
    expect(formatSettingsDate('not-a-date')).toBe('Unknown date');
    expect(formatSettingsDate('2027-02-30')).toBe('Unknown date');
  });

  it('keeps valid billing/invite dates truthful', () => {
    expect(formatSettingsDate('2026-06-21T18:30:00.000Z', { year: 'numeric', month: 'long', day: 'numeric' })).toBe('June 21, 2026');
  });

  it('formats date-only settings dates as the saved local calendar day', () => {
    const value = '2026-09-12';
    expect(toValidSettingsDateOrNull(value)?.getTime()).toBe(new Date(2026, 8, 12).getTime());
    expect(formatSettingsDate(value, { year: 'numeric', month: 'long', day: 'numeric' })).toBe('September 12, 2026');
  });
});
