import { describe, expect, it } from 'vitest';

import { getSiteVisibilityState } from '../../lib/siteVisibilityState';
import { getDemoDashboardSiteContext } from './dashboardDemoContext';

describe('demo dashboard site context', () => {
  it('hydrates the public demo as a live visible site', () => {
    const demoContext = getDemoDashboardSiteContext();
    const visibility = getSiteVisibilityState({
      isPublished: demoContext.isPublished,
      privacyMode: demoContext.privacyMode,
      hideFromSearch: demoContext.siteJson.hide_from_search,
    });

    expect(demoContext).toMatchObject({
      siteSlug: 'alex-jordan-demo',
      siteId: 'demo-site-id',
      role: 'owner',
    });
    expect(visibility.label).toBe('Shared and visible to guests');
    expect(visibility.searchLabel).toBe('Search visibility on');
    expect(visibility.explainer).toBe('The site is shared for guests at your DayOf URL.');
  });
});
