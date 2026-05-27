import { describe, expect, it } from 'vitest';
import { buildSiteAccessPlan } from './siteAccessPlan';

describe('buildSiteAccessPlan', () => {
  it('keeps launch-first guidance when the site is not live yet', () => {
    const plan = buildSiteAccessPlan({
      isPublished: false,
      privacyMode: 'password_protected',
      siteSlug: 'maya-leo',
    });

    expect(plan.focusTitle).toMatch(/launch the live guest path/i);
    expect(plan.bestNextMove).toMatch(/Publish the live guest-facing site/i);
    expect(plan.decisionRule).toMatch(/clear live path/i);
    expect(plan.steps[0]).toMatchObject({ status: 'current', id: 'publish' });
    expect(plan.steps[1]?.title).toMatch(/password/i);
  });

  it('pushes password handoff first for a protected live site', () => {
    const plan = buildSiteAccessPlan({
      isPublished: true,
      privacyMode: 'password_protected',
      siteSlug: 'maya-leo',
    });

    expect(plan.focusTitle).toMatch(/password instructions/i);
    expect(plan.bestNextMove).toMatch(/Attach the password instructions/i);
    expect(plan.steps[0]).toMatchObject({ status: 'current', id: 'access' });
    expect(plan.steps[0]?.detail).toMatch(/password/i);
  });

  it('pushes the invite-only path first for an invite-only live site', () => {
    const plan = buildSiteAccessPlan({
      isPublished: true,
      privacyMode: 'invite_only',
      siteSlug: 'maya-leo',
      guestAccessToken: 'guest-token',
    });

    expect(plan.focusTitle).toMatch(/invite-only route|front door/i);
    expect(plan.bestNextMove).toMatch(/Share and print the exact invite-only route/i);
    expect(plan.steps[0]).toMatchObject({ status: 'current', id: 'access' });
    expect(plan.steps[0]?.title).toMatch(/invite-only path/i);
  });

  it('treats a public live site as a consistency and restraint problem, not an access problem', () => {
    const plan = buildSiteAccessPlan({
      isPublished: true,
      privacyMode: 'public',
      siteSlug: 'maya-leo',
    });

    expect(plan.focusTitle).toMatch(/reuse one public path/i);
    expect(plan.bestNextMove).toMatch(/Reuse the same public URL/i);
    expect(plan.steps[0]).toMatchObject({ status: 'current', id: 'share' });
    expect(plan.steps[1]?.title).toMatch(/republish/i);
  });
});
