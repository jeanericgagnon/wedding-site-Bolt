import { demoWeddingSite } from '../../lib/demoData';

export function getDemoDashboardSiteContext() {
  return {
    siteSlug: 'alex-jordan-demo',
    siteId: demoWeddingSite.id,
    isPublished: true,
    privacyMode: 'public' as const,
    siteJson: { hide_from_search: false },
    role: 'owner' as const,
  };
}
