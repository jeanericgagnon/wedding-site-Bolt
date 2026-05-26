import { describe, expect, it } from 'vitest';

import { resolveDashboardLayoutSiteContext } from './dashboardSiteContext';

describe('resolveDashboardLayoutSiteContext', () => {
  it('preserves private live visibility modes from the site row', () => {
    const result = resolveDashboardLayoutSiteContext({
      id: 'site-123',
      is_published: true,
      privacy_mode: 'invite_only',
      site_json: { hide_from_search: true },
    });

    expect(result).toMatchObject({
      rowId: 'site-123',
      isPublished: true,
      privacyMode: 'invite_only',
      siteJson: { hide_from_search: true },
    });
  });

  it('falls back to public when privacy mode is missing or invalid', () => {
    expect(
      resolveDashboardLayoutSiteContext({
        id: 'site-123',
        is_published: true,
        privacy_mode: 'something-else',
        site_json: null,
      }).privacyMode,
    ).toBe('public');

    expect(resolveDashboardLayoutSiteContext(null).privacyMode).toBe('public');
  });
});
