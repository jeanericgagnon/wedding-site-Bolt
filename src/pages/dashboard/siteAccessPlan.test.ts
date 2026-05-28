import { describe, expect, it } from 'vitest';
import { buildSiteAccessPlan } from './siteAccessPlan';

describe('buildSiteAccessPlan', () => {
  it('keeps launch-first guidance when the site is still draft-only', () => {
    const plan = buildSiteAccessPlan({
      isPublished: false,
      privacyMode: 'password_protected',
      siteSlug: 'maya-leo',
    });

    expect(plan.focusTitle).toMatch(/launch the real guest-facing path/i);
    expect(plan.bestNextMove).toMatch(/Publish the guest-facing site/i);
    expect(plan.decisionRule).toMatch(/clear guest-facing path/i);
    expect(plan.watchout).toMatch(/dead end/i);
    expect(plan.steps[0]).toMatchObject({ status: 'current', id: 'publish' });
    expect(plan.steps[1]?.title).toMatch(/password/i);
    expect(plan.sequence.map((step) => step.status)).toEqual(['current', 'next', 'then']);
    expect(plan.sequence[0]?.title).toMatch(/front door|launch/i);
  });

  it('pushes password handoff first for a protected shared site', () => {
    const plan = buildSiteAccessPlan({
      isPublished: true,
      privacyMode: 'password_protected',
      siteSlug: 'maya-leo',
    });

    expect(plan.focusTitle).toMatch(/password instructions/i);
    expect(plan.bestNextMove).toMatch(/Attach the password instructions/i);
    expect(plan.watchout).toMatch(/password is missing/i);
    expect(plan.steps[0]).toMatchObject({ status: 'current', id: 'access' });
    expect(plan.steps[0]?.detail).toMatch(/password/i);
    expect(plan.sequence[1]?.detail).toMatch(/reminders|QR cards|handoff/i);
  });

  it('pushes the invite-only path first for an invite-only shared site', () => {
    const plan = buildSiteAccessPlan({
      isPublished: true,
      privacyMode: 'invite_only',
      siteSlug: 'maya-leo',
      guestAccessToken: 'guest-token',
    });

    expect(plan.focusTitle).toMatch(/invite-only route|front door/i);
    expect(plan.bestNextMove).toMatch(/Share and print the exact invite-only route/i);
    expect(plan.watchout).toMatch(/generic fallback link/i);
    expect(plan.steps[0]).toMatchObject({ status: 'current', id: 'access' });
    expect(plan.steps[0]?.title).toMatch(/invite-only path/i);
    expect(plan.sequence[2]?.detail).toMatch(/stable shared experience|worth the change/i);
  });

  it('treats a public shared site as a consistency and restraint problem, not an access problem', () => {
    const plan = buildSiteAccessPlan({
      isPublished: true,
      privacyMode: 'public',
      siteSlug: 'maya-leo',
    });

    expect(plan.focusTitle).toMatch(/reuse one public path/i);
    expect(plan.bestNextMove).toMatch(/Reuse the same public URL/i);
    expect(plan.watchout).toMatch(/alternate links|mixed instructions/i);
    expect(plan.steps[0]).toMatchObject({ status: 'current', id: 'share' });
    expect(plan.steps[1]?.title).toMatch(/republish/i);
    expect(plan.sequence[0]?.detail).toMatch(/same shared URL|trustworthy route/i);
  });
});
