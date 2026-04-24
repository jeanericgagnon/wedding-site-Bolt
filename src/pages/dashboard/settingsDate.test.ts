import { describe, expect, it } from 'vitest';

import { formatSettingsDate, toValidSettingsDateOrNull } from './settingsDate';

describe('settings date guards', () => {
  it('drops invalid persisted settings dates instead of rendering Invalid Date', () => {
    expect(toValidSettingsDateOrNull('not-a-date')).toBeNull();
    expect(formatSettingsDate('not-a-date')).toBe('Unknown date');
  });

  it('keeps valid billing/invite dates truthful', () => {
    expect(formatSettingsDate('2026-06-21T18:30:00.000Z', { year: 'numeric', month: 'long', day: 'numeric' })).toBe('June 21, 2026');
  });
});
