import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('remaining internal navigation bypass audit', () => {
  it('keeps public RSVP CTA on router links instead of hard reloads', () => {
    const source = read('src/components/site/sections/RsvpSection.tsx');

    expect(source).toContain("import { Link } from 'react-router-dom';");
    expect(source).toContain('to="/rsvp"');
    expect(source).not.toContain("window.location.href = '/rsvp';");
  });

  it('keeps builder privacy CTA on router navigation', () => {
    const source = read('src/builder/components/BuilderShell.tsx');

    expect(source).toContain("navigate('/dashboard/settings?tab=privacy');");
    expect(source).not.toContain("window.location.assign('/dashboard/settings?tab=privacy')");
  });

  it('keeps dashboard draft preview fallback on router navigation', () => {
    const source = read('src/pages/dashboard/OverviewDashboardLiveContent.tsx');

    expect(source).toContain('function openSitePreview(slug: string, isLive: boolean, navigate: (href: string) => void) {');
    expect(source).toContain("navigate('/dashboard/builder');");
    expect(source).toContain('openSitePreview(stats.siteSlug!, siteVisibility.isLive, navigate)');
    expect(source).not.toContain("window.location.assign('/dashboard/builder')");
  });

  it('keeps payment bypass continuation on router navigation while preserving external checkout redirects', () => {
    const source = read('src/pages/PaymentRequired.tsx');

    expect(source).toContain("navigate('/onboarding/celebration?bypassPayment=1', { replace: true });");
    expect(source).toContain('window.location.href = url;');
    expect(source).not.toContain("window.location.assign('/onboarding/celebration?bypassPayment=1')");
  });
});
