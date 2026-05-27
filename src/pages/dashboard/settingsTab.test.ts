import { describe, expect, it } from 'vitest';
import { resolveSettingsTabFromSearch } from './settingsTab';

describe('resolveSettingsTabFromSearch', () => {
  it('reads a supported tab from the search string', () => {
    expect(resolveSettingsTabFromSearch('?tab=site')).toBe('site');
    expect(resolveSettingsTabFromSearch('?tab=billing')).toBe('billing');
  });

  it('falls back to account for unsupported or missing tabs', () => {
    expect(resolveSettingsTabFromSearch('')).toBe('account');
    expect(resolveSettingsTabFromSearch('?tab=unknown')).toBe('account');
  });
});
