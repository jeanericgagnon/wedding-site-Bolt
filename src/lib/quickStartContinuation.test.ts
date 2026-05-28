import { describe, expect, it } from 'vitest';
import {
  buildQuickStartEntryPath,
  buildQuickStartGuestsPath,
  buildQuickStartManualSetupPath,
  buildQuickStartOverviewPath,
  buildQuickStartPhotosPath,
  readQuickStartDashboardContinuation,
} from './quickStartContinuation';

describe('quickStartContinuation', () => {
  it('uses one canonical quick start entry path', () => {
    expect(buildQuickStartEntryPath()).toBe('/onboarding/quick-start?bypassPayment=1');
  });

  it('keeps the downstream continuation paths stable', () => {
    expect(buildQuickStartManualSetupPath()).toBe('/onboarding?bypassPayment=1');
    expect(buildQuickStartGuestsPath()).toBe('/dashboard/guests?bypassPayment=1&fromQuickStart=1&next=photos');
    expect(buildQuickStartPhotosPath()).toBe('/dashboard/photos?bypassPayment=1&fromQuickStart=1&next=review');
    expect(buildQuickStartOverviewPath()).toBe('/dashboard/overview?bypassPayment=1&fromQuickStart=1');
  });

  it('sanitizes dashboard continuation query params', () => {
    expect(readQuickStartDashboardContinuation(new URLSearchParams('fromQuickStart=1&next=photos'))).toEqual({
      fromQuickStart: true,
      nextStep: 'photos',
    });
    expect(readQuickStartDashboardContinuation(new URLSearchParams('fromQuickStart=0&next=evil'))).toEqual({
      fromQuickStart: false,
      nextStep: null,
    });
  });
});
