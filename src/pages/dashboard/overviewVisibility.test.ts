import { describe, expect, it } from 'vitest';

import { getOverviewHideFromSearch, getOverviewPrivacyMode } from './overviewVisibility';

describe('overviewVisibility', () => {
  it('keeps overview privacy mode aligned with supported site modes', () => {
    expect(getOverviewPrivacyMode('public')).toBe('public');
    expect(getOverviewPrivacyMode('password_protected')).toBe('password_protected');
    expect(getOverviewPrivacyMode('invite_only')).toBe('invite_only');
    expect(getOverviewPrivacyMode('unknown')).toBe('public');
    expect(getOverviewPrivacyMode(null)).toBe('public');
  });

  it('keeps hide-from-search truth when either row or site json carries the flag', () => {
    expect(getOverviewHideFromSearch({ hide_from_search: true }, null)).toBe(true);
    expect(getOverviewHideFromSearch({ hide_from_search: false }, { hide_from_search: true })).toBe(true);
    expect(getOverviewHideFromSearch({ hide_from_search: false }, { hide_from_search: false })).toBe(false);
    expect(getOverviewHideFromSearch(null, null)).toBe(false);
  });
});
