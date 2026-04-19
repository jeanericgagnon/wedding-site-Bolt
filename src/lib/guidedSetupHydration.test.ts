import { describe, expect, it } from 'vitest';

const shouldFetchGuidedSetupSite = (resolvedSiteId: string | null) => Boolean(resolvedSiteId);

const shouldRunGuidedSetupDraftHydration = (hasHydratedDraft: boolean, runCount: number) => {
  return !hasHydratedDraft && runCount === 0;
};

describe('guidedSetup hydration guards', () => {
  it('does not fetch wedding site data when no site id resolves', () => {
    expect(shouldFetchGuidedSetupSite(null)).toBe(false);
    expect(shouldFetchGuidedSetupSite('site_123')).toBe(true);
  });

  it('treats local draft hydration as a one-time startup pass', () => {
    expect(shouldRunGuidedSetupDraftHydration(false, 0)).toBe(true);
    expect(shouldRunGuidedSetupDraftHydration(true, 1)).toBe(false);
    expect(shouldRunGuidedSetupDraftHydration(false, 1)).toBe(false);
  });
});
