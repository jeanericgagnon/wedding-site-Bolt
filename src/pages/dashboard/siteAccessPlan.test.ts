import { describe, expect, it } from 'vitest';
import { buildSiteAccessPlan } from './siteAccessPlan';

describe('buildSiteAccessPlan', () => {
  it('keeps launch-first guidance when the site is not live yet', () => {
    const plan = buildSiteAccessPlan({
      isPublished: false,
      privacyMode: 'password_protected',
      siteSlug: 'maya-leo',
    });

    expect(plan[0]).toMatchObject({ status: 'current', id: 'publish' });
    expect(plan[1]?.title).toMatch(/password/i);
  });

  it('pushes password handoff first for a protected live site', () => {
    const plan = buildSiteAccessPlan({
      isPublished: true,
      privacyMode: 'password_protected',
      siteSlug: 'maya-leo',
    });

    expect(plan[0]).toMatchObject({ status: 'current', id: 'access' });
    expect(plan[0]?.detail).toMatch(/password/i);
  });

  it('pushes the invite-only path first for an invite-only live site', () => {
    const plan = buildSiteAccessPlan({
      isPublished: true,
      privacyMode: 'invite_only',
      siteSlug: 'maya-leo',
      guestAccessToken: 'guest-token',
    });

    expect(plan[0]).toMatchObject({ status: 'current', id: 'access' });
    expect(plan[0]?.title).toMatch(/invite-only path/i);
  });

  it('treats a public live site as a consistency and restraint problem, not an access problem', () => {
    const plan = buildSiteAccessPlan({
      isPublished: true,
      privacyMode: 'public',
      siteSlug: 'maya-leo',
    });

    expect(plan[0]).toMatchObject({ status: 'current', id: 'share' });
    expect(plan[1]?.title).toMatch(/republish/i);
  });
});
