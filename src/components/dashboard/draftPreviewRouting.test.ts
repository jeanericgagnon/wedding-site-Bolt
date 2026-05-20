import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('draft preview routing', () => {
  it('routes owner preview CTAs to the builder while the site is draft-only', () => {
    const dashboardLayout = readFileSync(join(process.cwd(), 'src/components/dashboard/DashboardLayout.tsx'), 'utf8');
    const dashboardLayoutSiteContext = readFileSync(join(process.cwd(), 'src/components/dashboard/dashboardLayoutSiteContext.ts'), 'utf8');
    const overview = readFileSync(join(process.cwd(), 'src/pages/dashboard/OverviewDashboardLiveContent.tsx'), 'utf8');

    expect(dashboardLayout).toContain("const previewShareHref = siteVisibility.state === 'draft' ? '/dashboard/builder' : siteSlug ? `/site/${siteSlug}` : '/dashboard/builder';");
    expect(dashboardLayout).toContain("const previewShareExternal = siteVisibility.state !== 'draft' && Boolean(siteSlug);");
    expect(dashboardLayout).toContain('href={previewShareHref}');
    expect(dashboardLayout).toContain("target={previewShareExternal ? '_blank' : undefined}");
    expect(dashboardLayout).toContain('setters.setSiteSlug(siteContext.siteSlug);');
    expect(dashboardLayoutSiteContext).toContain('siteSlug: resolvePublicSiteSlugFromRow(guestFacingSiteRow) ?? null,');
    expect(overview).toContain("navigate('/dashboard/builder');");
    expect(overview).not.toContain("window.location.assign('/dashboard/builder');");
    expect(overview).toContain("siteVisibility.isLive ? 'Preview site' : 'Preview draft'");
    expect(overview).toContain("siteVisibility.isLive ? 'Preview what guests will see' : 'Open your draft preview'");
  });
});
