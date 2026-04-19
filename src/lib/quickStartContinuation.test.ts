import { describe, expect, it } from 'vitest';
import { buildQuickStartEntryPath, buildQuickStartGuestsPath, buildQuickStartOverviewPath, buildQuickStartPhotosPath } from './quickStartContinuation';

describe('quickStartContinuation', () => {
  it('uses one canonical quick start entry path', () => {
    expect(buildQuickStartEntryPath()).toBe('/onboarding/quick-start?bypassPayment=1');
  });

  it('keeps the downstream continuation paths stable', () => {
    expect(buildQuickStartGuestsPath()).toBe('/dashboard/guests?bypassPayment=1&fromQuickStart=1&next=photos');
    expect(buildQuickStartPhotosPath()).toBe('/dashboard/photos?bypassPayment=1&fromQuickStart=1&next=review');
    expect(buildQuickStartOverviewPath()).toBe('/dashboard/overview?bypassPayment=1&fromQuickStart=1');
  });
});
