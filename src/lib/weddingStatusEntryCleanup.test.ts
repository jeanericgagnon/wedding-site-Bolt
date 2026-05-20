import { beforeEach, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { clearOnboardingEntryReturnPath } from './onboardingEntryCleanup';
import { writeSignupReturnPath, readSignupReturnPath } from './signupContinuation';

describe('weddingStatus entry cleanup', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('can clear stale signup return state once wedding status onboarding has started', () => {
    writeSignupReturnPath('/onboarding/quick-start?bypassPayment=1');
    clearOnboardingEntryReturnPath();
    expect(readSignupReturnPath()).toBeNull();
  });

  it('keeps the scoped cleanup path visible in wedding status source', async () => {
    const source = await readFile('/Users/ericgagnon/Documents/DayOfLove/wedding-site-Bolt/src/pages/onboarding/WeddingStatus.tsx', 'utf8');
    expect(source).toContain('clearOnboardingEntryReturnPath(onboardingStorageScope)');
  });
});
