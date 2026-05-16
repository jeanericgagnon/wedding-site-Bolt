import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('draft preview routing', () => {
  it('routes owner preview CTAs to the builder while the site is draft-only', () => {
    const dashboardLayout = readFileSync(join(process.cwd(), 'src/components/dashboard/DashboardLayout.tsx'), 'utf8');
    const overview = readFileSync(join(process.cwd(), 'src/pages/dashboard/OverviewDashboardLiveContent.tsx'), 'utf8');

    expect(dashboardLayout).toContain("href={siteVisibility.state === 'draft' ? '/dashboard/builder' : `/site/${siteSlug}`}");
    expect(dashboardLayout).toContain("{(siteVisibility.state === 'draft' || siteSlug) && (");
    expect(dashboardLayout).toContain("{siteVisibility.state === 'draft' ? 'Preview draft' : 'View site'}");
    expect(dashboardLayout).toContain('setSiteSlug(resolved ?? null);');
    expect(overview).toContain("window.location.assign('/dashboard/builder');");
    expect(overview).toContain("siteVisibility.isLive ? 'Preview site' : 'Preview draft'");
    expect(overview).toContain("siteVisibility.isLive ? 'Preview what guests will see' : 'Open your draft preview'");
  });
});
